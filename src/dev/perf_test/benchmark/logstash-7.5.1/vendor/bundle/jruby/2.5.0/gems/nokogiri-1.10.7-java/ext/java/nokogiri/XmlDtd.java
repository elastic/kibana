/**
 * (The MIT License)
 *
 * Copyright (c) 2008 - 2011:
 *
 * * {Aaron Patterson}[http://tenderlovemaking.com]
 * * {Mike Dalessio}[http://mike.daless.io]
 * * {Charles Nutter}[http://blog.headius.com]
 * * {Sergio Arbeo}[http://www.serabe.com]
 * * {Patrick Mahoney}[http://polycrystal.org]
 * * {Yoko Harada}[http://yokolet.blogspot.com]
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

package nokogiri;

import static nokogiri.internals.NokogiriHelpers.getNokogiriClass;
import static nokogiri.internals.NokogiriHelpers.nonEmptyStringOrNil;
import static nokogiri.internals.NokogiriHelpers.stringOrNil;
import static org.jruby.runtime.Helpers.invoke;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.apache.xerces.xni.QName;
import org.cyberneko.dtd.DTDConfiguration;
import org.jruby.Ruby;
import org.jruby.RubyArray;
import org.jruby.RubyClass;
import org.jruby.RubyHash;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Document;
import org.w3c.dom.DocumentType;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

import nokogiri.internals.NokogiriHelpers;
import nokogiri.internals.SaveContextVisitor;

/**
 * Class for Nokogiri::XML::DTD
 * 
 * @author sergio
 * @author Patrick Mahoney <pat@polycrystal.org>
 * @author Yoko Harada <yokolet@gmail.com>
 */

@JRubyClass(name="Nokogiri::XML::DTD", parent="Nokogiri::XML::Node")
public class XmlDtd extends XmlNode {
    /** cache of children, Nokogiri::XML::NodeSet */
    protected IRubyObject children = null;

    /** cache of name => XmlAttributeDecl */
    protected RubyHash attributes = null;

    /** cache of name => XmlElementDecl */
    protected RubyHash elements = null;

    /** cache of name => XmlEntityDecl */
    protected RubyHash entities = null;

    /** cache of name => Nokogiri::XML::Notation */
    protected RubyHash notations = null;
    protected RubyClass notationClass;

    /** temporary store of content models before they are added to
     * their XmlElementDecl. */
    protected RubyHash contentModels;

    /** node name */
    protected IRubyObject name;

    /** public ID (or external ID) */
    protected IRubyObject pubId;

    /** system ID */
    protected IRubyObject sysId;

    public XmlDtd(Ruby ruby, RubyClass rubyClass) {
        super(ruby, rubyClass);
    }
    
    public void setNode(Ruby runtime, Node dtd) {
        this.node = dtd;
        notationClass = (RubyClass) runtime.getClassFromPath("Nokogiri::XML::Notation");

        name = pubId = sysId = runtime.getNil();
        if (dtd == null) return;

        // This is the dtd declaration stored in the document; it
        // contains the DTD name (root element) and public and system
        // ids. The actual declarations are in the NekoDTD 'dtd'
        // variable. I don't know of a way to consolidate the two.

        DocumentType otherDtd = dtd.getOwnerDocument().getDoctype();
        if (otherDtd != null) {
            name = stringOrNil(runtime, otherDtd.getNodeName());
            pubId = nonEmptyStringOrNil(runtime, otherDtd.getPublicId());
            sysId = nonEmptyStringOrNil(runtime, otherDtd.getSystemId());
        }
    }

    public XmlDtd(Ruby ruby, RubyClass rubyClass, Node dtd) {
        super(ruby, rubyClass, dtd);
        setNode(ruby, dtd);
    }

    public static XmlDtd newEmpty(Ruby runtime,
                                  Document doc,
                                  IRubyObject name,
                                  IRubyObject external_id,
                                  IRubyObject system_id) {

        DocumentType placeholder;
        if (doc.getDoctype() == null) {
          String javaName = NokogiriHelpers.rubyStringToString(name);
          String javaExternalId = NokogiriHelpers.rubyStringToString(external_id);
          String javaSystemId = NokogiriHelpers.rubyStringToString(system_id);
          placeholder = doc.getImplementation().createDocumentType(javaName, javaExternalId, javaSystemId);
          doc.appendChild(placeholder);
        } else {
          placeholder = doc.getDoctype();
        }
        // FIXME: what if the document had a doc type, why are we here ?
        XmlDtd dtd = (XmlDtd) NokogiriService.XML_DTD_ALLOCATOR.allocate(runtime, getNokogiriClass(runtime, "Nokogiri::XML::DTD"));
        dtd.setNode(runtime, placeholder);
        dtd.name = name;
        dtd.pubId = external_id;
        dtd.sysId = system_id;
        return dtd;
    }


    /**
     * Create an unparented element that contains DTD declarations
     * parsed from the internal subset attached as user data to
     * <code>doc</code>.  The attached dtd must be the tree from
     * NekoDTD. The owner document of the returned tree will be
     * <code>doc</doc>.
     *
     * NekoDTD parser returns a new document node containing elements
     * representing the dtd declarations. The plan is to get the root
     * element and adopt it into the correct document, stipping the
     * Document provided by NekoDTD.
     *
     */
    public static XmlDtd newFromInternalSubset(Ruby runtime, Document doc) {
        Object dtdTree_ = doc.getUserData(XmlDocument.DTD_RAW_DOCUMENT);
        if (dtdTree_ == null) {
            XmlDtd xmlDtd = (XmlDtd) NokogiriService.XML_DTD_ALLOCATOR.allocate(runtime, getNokogiriClass(runtime, "Nokogiri::XML::DTD"));
            xmlDtd.setNode(runtime, null);
            return xmlDtd;
        }

        Node dtdTree = (Node) dtdTree_;
        Node dtd = getInternalSubset(dtdTree);
        if (dtd == null) {
            XmlDtd xmlDtd = (XmlDtd) NokogiriService.XML_DTD_ALLOCATOR.allocate(runtime, getNokogiriClass(runtime, "Nokogiri::XML::DTD"));
            xmlDtd.setNode(runtime, null);
            return xmlDtd;
        } else {
            // Import the node into doc so it has the correct owner document.
            dtd = doc.importNode(dtd, true);
            XmlDtd xmlDtd = (XmlDtd) NokogiriService.XML_DTD_ALLOCATOR.allocate(runtime, getNokogiriClass(runtime, "Nokogiri::XML::DTD"));
            xmlDtd.setNode(runtime, dtd);
            return xmlDtd;
        }
    }

    public static IRubyObject newFromExternalSubset(Ruby runtime, Document doc) {
        Object dtdTree_ = doc.getUserData(XmlDocument.DTD_RAW_DOCUMENT);
        if (dtdTree_ == null) {
            return runtime.getNil();
        }

        Node dtdTree = (Node) dtdTree_;
        Node dtd = getExternalSubset(dtdTree);
        if (dtd == null) {
            return runtime.getNil();
        } else if (!dtd.hasChildNodes()) {
            return runtime.getNil();
        } else {
            // Import the node into doc so it has the correct owner document.
            dtd = doc.importNode(dtd, true);
            XmlDtd xmlDtd = (XmlDtd) NokogiriService.XML_DTD_ALLOCATOR.allocate(runtime, getNokogiriClass(runtime, "Nokogiri::XML::DTD"));
            xmlDtd.setNode(runtime, dtd);
            return xmlDtd;
        }
    }

    /*
     * <code>dtd</code> is the document node of a NekoDTD tree.
     * NekoDTD tree looks like this:
     *
     * <code><pre>
     * [#document: null]
     *   [#comment: ...]
     *   [#comment: ...]
     *   [dtd: null]   // a DocumentType; isDTD(node) => false
     *   [dtd: null]   // root of dtd, an Element node; isDTD(node) => true
     *     ... decls, content models, etc. ...
     *     [externalSubset: null] pubid="the pubid" sysid="the sysid"
     *       ... external subset decls, etc. ...
     * </pre></code>
     */
    protected static Node getInternalSubset(Node dtdTree) {
        Node root;
        for (root = dtdTree.getFirstChild(); ; root = root.getNextSibling()) {
            if (root == null)
                return null;
            else if (isDTD(root))
                return root;      // we have second dtd which is root
        }
    }

    protected static Node getExternalSubset(Node dtdTree) {
        Node dtd = getInternalSubset(dtdTree);
        if (dtd == null) return null;
        for (Node ext = dtd.getFirstChild(); ; ext = ext.getNextSibling()) {
            if (ext == null)
                return null;
            else if (isExternalSubset(ext))
                return ext;
        }
    }

    /**
     * This overrides the #attributes method defined in
     * lib/nokogiri/xml/node.rb.
     */
    @JRubyMethod
    public IRubyObject attributes(ThreadContext context) {
        if (attributes == null) extractDecls(context);

        return attributes;
    }

    @JRubyMethod
    public IRubyObject elements(ThreadContext context) {
        if (elements == null) extractDecls(context);

        return elements;
    }

    @JRubyMethod
    public IRubyObject entities(ThreadContext context) {
        if (entities == null) extractDecls(context);

        return entities;
    }

    @JRubyMethod
    public IRubyObject notations(ThreadContext context) {
        if (notations == null) extractDecls(context);

        return notations;
    }

    /**
     * Our "node" object is as-returned by NekoDTD.  The actual
     * "children" that we're interested in (Attribute declarations,
     * etc.) are a few layers deep.
     */
    @Override
    @JRubyMethod
    public IRubyObject children(ThreadContext context) {
        if (children == null) extractDecls(context);

        return children;
    }

    /**
     * Returns the name of the dtd.
     */
    @Override
    @JRubyMethod
    public IRubyObject node_name(ThreadContext context) {
        return name;
    }

    @Override
    @JRubyMethod(name = "node_name=")
    public IRubyObject node_name_set(ThreadContext context, IRubyObject name) {
        throw context.getRuntime()
            .newRuntimeError("cannot change name of DTD");
    }

    @JRubyMethod
    public IRubyObject system_id(ThreadContext context) {
        return sysId;
    }

    @JRubyMethod
    public IRubyObject external_id(ThreadContext context) {
        return pubId;
    }
    
    @JRubyMethod
    public IRubyObject validate(ThreadContext context, IRubyObject doc) {
        RubyArray errors = RubyArray.newArray(context.getRuntime());
        if (doc instanceof XmlDocument) {
          errors = (RubyArray) ((XmlDocument)doc).getInstanceVariable("@errors");
        }
        return errors;
    }

    public static boolean nameEquals(Node node, QName name) {
        return name.localpart.equals(node.getNodeName());
    }

    public static boolean isExternalSubset(Node node) {
        return nameEquals(node, DTDConfiguration.E_EXTERNAL_SUBSET);
    }

    /**
     * Checks instanceof Element so we return false for a DocumentType
     * node (NekoDTD uses Element for all its nodes).
     */
    public static boolean isDTD(Node node) {
        return (node instanceof Element &&
                nameEquals(node, DTDConfiguration.E_DTD));
    }

    public static boolean isAttributeDecl(Node node) {
        return nameEquals(node, DTDConfiguration.E_ATTRIBUTE_DECL);
    }

    public static boolean isElementDecl(Node node) {
        return nameEquals(node, DTDConfiguration.E_ELEMENT_DECL);
    }

    public static boolean isEntityDecl(Node node) {
        return (nameEquals(node, DTDConfiguration.E_INTERNAL_ENTITY_DECL) ||
                nameEquals(node, DTDConfiguration.E_UNPARSED_ENTITY_DECL));
    }

    public static boolean isNotationDecl(Node node) {
        return nameEquals(node, DTDConfiguration.E_NOTATION_DECL);
    }

    public static boolean isContentModel(Node node) {
        return nameEquals(node, DTDConfiguration.E_CONTENT_MODEL);
    }

    /**
     * Recursively extract various DTD declarations and store them in
     * the various collections.
     */
    protected void extractDecls(ThreadContext context) {
        Ruby runtime = context.getRuntime();

        // initialize data structures
        attributes = RubyHash.newHash(runtime);
        elements = RubyHash.newHash(runtime);
        entities = RubyHash.newHash(runtime);
        notations = RubyHash.newHash(runtime);
        contentModels = RubyHash.newHash(runtime);
        children = runtime.getNil();

        // recursively extract decls
        if (node == null) return; // leave all the decl hash's empty

        // convert allDecls to a NodeSet
        children = XmlNodeSet.newXmlNodeSet(context, extractDecls(context, node.getFirstChild()));

        // add attribute decls as attributes to the matching element decl
        RubyArray keys = attributes.keys();
        for (int i = 0; i < keys.getLength(); ++i) {
            IRubyObject akey = keys.entry(i);
            IRubyObject val;

            val = attributes.op_aref(context, akey);
            if (val.isNil()) continue;
            XmlAttributeDecl attrDecl = (XmlAttributeDecl) val;
            IRubyObject ekey = attrDecl.element_name(context);
            val = elements.op_aref(context, ekey);
            if (val.isNil()) continue;
            XmlElementDecl elemDecl = (XmlElementDecl) val;

            elemDecl.appendAttrDecl(attrDecl);
        }

        // add content models to the matching element decl
        keys = contentModels.keys();
        for (int i = 0; i < keys.getLength(); ++i) {
            IRubyObject key = keys.entry(i);
            IRubyObject cm = contentModels.op_aref(context, key);

            IRubyObject elem = elements.op_aref(context, key);
            if (elem.isNil()) continue;
            if (((XmlElementDecl)elem).isEmpty()) continue;
            ((XmlElementDecl) elem).setContentModel(cm);
        }
    }

    /**
     * The <code>node</code> is either the first child of the root dtd
     * node (as returned by getInternalSubset()) or the first child of
     * the external subset node (as returned by getExternalSubset()).
     *
     * This recursive function will not descend into an
     * 'externalSubset' node, thus for an internal subset it only
     * extracts nodes in the internal subset, and for an external
     * subset it extracts everything and assumess <code>node</code>
     * and all children are part of the external subset.
     */
    protected IRubyObject[] extractDecls(ThreadContext context, Node node) {
        List<IRubyObject> decls = new ArrayList<IRubyObject>();
        while (node != null) {
            if (isExternalSubset(node)) {
                break;
            } else if (isAttributeDecl(node)) {
                XmlAttributeDecl decl = (XmlAttributeDecl)
                    XmlAttributeDecl.create(context, node);
                attributes.op_aset(context, decl.attribute_name(context), decl);
                decls.add(decl);
            } else if (isElementDecl(node)) {
                XmlElementDecl decl = (XmlElementDecl)
                    XmlElementDecl.create(context, node);
                elements.op_aset(context, decl.element_name(context), decl);
                decls.add(decl);
            } else if (isEntityDecl(node)) {
                XmlEntityDecl decl = (XmlEntityDecl)
                    XmlEntityDecl.create(context, node);
                entities.op_aset(context, decl.node_name(context), decl);
                decls.add(decl);
            } else if (isNotationDecl(node)) {
                XmlNode tmp = (XmlNode)
                    NokogiriHelpers.constructNode(context.getRuntime(), node);
                IRubyObject decl = invoke(context, notationClass, "new",
                                          tmp.getAttribute(context, "name"),
                                          tmp.getAttribute(context, "pubid"),
                                          tmp.getAttribute(context, "sysid"));
                notations.op_aset(context,
                                  tmp.getAttribute(context, "name"), decl);
                decls.add(decl);
            } else if (isContentModel(node)) {
                XmlElementContent cm =
                    new XmlElementContent(context.getRuntime(),
                                          (XmlDocument) document(context),
                                          node);
                contentModels.op_aset(context, cm.element_name(context), cm);
            } else {
                // recurse
                decls.addAll(Arrays.asList(extractDecls(context, node.getFirstChild())));
            }

            node = node.getNextSibling();
        }

        return decls.toArray(new IRubyObject[decls.size()]);
    }

    @Override
    public void accept(ThreadContext context, SaveContextVisitor visitor) {
        // since we use nekoDTD to parse dtd, node might be ElementImpl type
        // An external subset doesn't need to show up, so this method just see docType.
        DocumentType docType = node.getOwnerDocument().getDoctype();
        visitor.enter(docType);
        visitor.leave(docType);
    }
}
