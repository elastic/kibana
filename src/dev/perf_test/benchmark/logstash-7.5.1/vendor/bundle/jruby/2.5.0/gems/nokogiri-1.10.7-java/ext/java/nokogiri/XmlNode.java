/**
 * (The MIT License)
 *
 * Copyright (c) 2008 - 2014:
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

import static java.lang.Math.max;
import static nokogiri.internals.NokogiriHelpers.clearXpathContext;
import static nokogiri.internals.NokogiriHelpers.convertEncoding;
import static nokogiri.internals.NokogiriHelpers.convertString;
import static nokogiri.internals.NokogiriHelpers.getCachedNodeOrCreate;
import static nokogiri.internals.NokogiriHelpers.getNokogiriClass;
import static nokogiri.internals.NokogiriHelpers.isBlank;
import static nokogiri.internals.NokogiriHelpers.nodeArrayToRubyArray;
import static nokogiri.internals.NokogiriHelpers.nonEmptyStringOrNil;
import static nokogiri.internals.NokogiriHelpers.rubyStringToString;
import static nokogiri.internals.NokogiriHelpers.stringOrNil;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import org.apache.xerces.dom.CoreDocumentImpl;
import org.jruby.Ruby;
import org.jruby.RubyArray;
import org.jruby.RubyClass;
import org.jruby.RubyFixnum;
import org.jruby.RubyInteger;
import org.jruby.RubyModule;
import org.jruby.RubyObject;
import org.jruby.RubyString;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.exceptions.RaiseException;
import org.jruby.runtime.Helpers;
import org.jruby.runtime.Block;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.Visibility;
import org.jruby.runtime.builtin.IRubyObject;
import org.jruby.util.ByteList;
import org.w3c.dom.Attr;
import org.w3c.dom.Document;
import org.w3c.dom.DocumentFragment;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.w3c.dom.Text;

import nokogiri.internals.HtmlDomParserContext;
import nokogiri.internals.NokogiriHelpers;
import nokogiri.internals.NokogiriNamespaceCache;
import nokogiri.internals.SaveContextVisitor;
import nokogiri.internals.XmlDomParserContext;

/**
 * Class for Nokogiri::XML::Node
 *
 * @author sergio
 * @author Patrick Mahoney <pat@polycrystal.org>
 * @author Yoko Harada <yokolet@gmail.com>
 * @author John Shahid <jvshahid@gmail.com>
 */
@JRubyClass(name="Nokogiri::XML::Node")
public class XmlNode extends RubyObject {
    protected static final String TEXT_WRAPPER_NAME = "nokogiri_text_wrapper";

    /** The underlying Node object. */
    protected Node node;

    /* Cached objects */
    protected IRubyObject content = null;
    protected IRubyObject doc = null;
    protected IRubyObject name = null;

    /*
     * Taken from http://ejohn.org/blog/comparing-document-position/
     * Used for compareDocumentPosition.
     * <ironic>Thanks to both java api and w3 doc for its helpful documentation</ironic>
     */

    protected static final int IDENTICAL_ELEMENTS = 0;
    protected static final int IN_DIFFERENT_DOCUMENTS = 1;
    protected static final int SECOND_PRECEDES_FIRST = 2;
    protected static final int FIRST_PRECEDES_SECOND = 4;
    protected static final int SECOND_CONTAINS_FIRST = 8;
    protected static final int FIRST_CONTAINS_SECOND = 16;

    /**
     * Cast <code>node</code> to an XmlNode or raise a type error
     * in <code>context</code>.
     */
    protected static XmlNode asXmlNode(ThreadContext context, IRubyObject node) {
        if ( !(node instanceof XmlNode) ) {
            final Ruby runtime = context.getRuntime();
            throw runtime.newTypeError(node == null ? runtime.getNil() : node, getNokogiriClass(runtime, "Nokogiri::XML::Node"));
        }
        return (XmlNode) node;
    }

    /**
     * Cast <code>node</code> to an XmlNode, or null if RubyNil, or
     * raise a type error in <code>context</code>.
     */
    protected static XmlNode asXmlNodeOrNull(ThreadContext context, IRubyObject node) {
        if (node == null || node.isNil()) return null;
        return asXmlNode(context, node);
    }

    /**
     * Coalesce to adjacent TextNodes.
     * @param context
     * @param prev Previous node to cur.
     * @param cur Next node to prev.
     */
    public static void coalesceTextNodes(ThreadContext context, IRubyObject prev, IRubyObject cur) {
        XmlNode p = asXmlNode(context, prev);
        XmlNode c = asXmlNode(context, cur);

        Node pNode = p.node;
        Node cNode = c.node;

        pNode.setNodeValue(pNode.getNodeValue()+cNode.getNodeValue());
        p.content = null;       // clear cached content

        c.assimilateXmlNode(context, p);
    }

    /**
     * Coalesce text nodes around <code>anchorNode</code>.  If
     * <code>anchorNode</code> has siblings (previous or next) that
     * are text nodes, the content will be merged into
     * <code>anchorNode</code> and the redundant nodes will be removed
     * from the DOM.
     *
     * To match libxml behavior (?) the final content of
     * <code>anchorNode</code> and any removed nodes will be
     * identical.
     *
     * @param context
     * @param anchorNode
     */
    protected static void coalesceTextNodes(ThreadContext context,
                                            IRubyObject anchorNode,
                                            AdoptScheme scheme) {
        XmlNode xa = asXmlNode(context, anchorNode);

        XmlNode xp = asXmlNodeOrNull(context, xa.previous_sibling(context));
        XmlNode xn = asXmlNodeOrNull(context, xa.next_sibling(context));

        Node p = xp == null ? null : xp.node;
        Node a = xa.node;
        Node n = xn == null ? null : xn.node;

        Node parent = a.getParentNode();

        boolean shouldMergeP = scheme == AdoptScheme.NEXT_SIBLING || scheme == AdoptScheme.CHILD || scheme == AdoptScheme.REPLACEMENT;
        boolean shouldMergeN = scheme == AdoptScheme.PREV_SIBLING || scheme == AdoptScheme.REPLACEMENT;

        // apply the merge right to left
        if (shouldMergeN && n != null && n.getNodeType() == Node.TEXT_NODE) {
            xa.setContent(a.getNodeValue() + n.getNodeValue());
            parent.removeChild(n);
            xn.assimilateXmlNode(context, xa);
        }
        if (shouldMergeP && p != null && p.getNodeType() == Node.TEXT_NODE) {
            xp.setContent(p.getNodeValue() + a.getNodeValue());
            parent.removeChild(a);
            xa.assimilateXmlNode(context, xp);
        }
    }

    /**
     * This is the allocator for XmlNode class.  It should only be
     * called from Ruby code.
     */
    public XmlNode(Ruby ruby, RubyClass cls) {
        super(ruby, cls);
    }

    /**
     * This is a constructor to create an XmlNode from an already
     * existing node.  It may be called by Java code.
     */
    public XmlNode(Ruby ruby, RubyClass cls, Node node) {
        super(ruby, cls);
        setNode(ruby.getCurrentContext(), node);
    }

    protected void decorate(final ThreadContext context) {
        if (node != null) {
            resetCache();

            if (node.getNodeType() != Node.DOCUMENT_NODE) {
                doc = document(context.runtime);

                if (doc != null && ! doc.isNil()) {
                    Helpers.invoke(context, doc, "decorate", this);
                }
            }
        }
    }

    /**
     * Create and return a copy of this object.
     *
     * @return a clone of this object
     */
    @Override
    public Object clone() throws CloneNotSupportedException {
        return super.clone();
    }

    protected void resetCache() {
        node.setUserData(NokogiriHelpers.CACHED_NODE, this, null);
    }

    /**
     * Allocate a new object, perform initialization, call that
     * object's initialize method, and call any block passing the
     * object as the only argument.  If <code>cls</code> is
     * Nokogiri::XML::Node, creates a new Nokogiri::XML::Element
     * instead.
     *
     * This static method seems to be inherited, strangely enough.
     * E.g. creating a new XmlAttr from Ruby code calls this method if
     * XmlAttr does not define its own 'new' method.
     *
     * Since there is some Java bookkeeping that always needs to
     * happen, we don't define the 'initialize' method in Java because
     * we'd have to count on subclasses calling 'super'.
     *
     * The main consequence of this is that every subclass needs to
     * define its own 'new' method.
     *
     * As a convenience, this method does the following:
     *
     * <ul>
     *
     * <li>allocates a new object using the allocator assigned to
     * <code>cls</code></li>
     *
     * <li>calls the Java method init(); subclasses can override this,
     * otherwise they should implement a specific 'new' method</li>
     *
     * <li>invokes the Ruby initializer</li>
     *
     * <li>if a block is given, calls the block with the new node as
     * the argument</li>
     *
     * </ul>
     *
     * -pmahoney
     */
    @JRubyMethod(name = "new", meta = true, rest = true)
    public static IRubyObject rbNew(ThreadContext context, IRubyObject cls,
                                    IRubyObject[] args, Block block) {
        Ruby ruby = context.getRuntime();
        RubyClass klazz = (RubyClass) cls;

        if ("Nokogiri::XML::Node".equals(klazz.getName())) {
            klazz = getNokogiriClass(ruby, "Nokogiri::XML::Element");
        }

        XmlNode xmlNode = (XmlNode) klazz.allocate();
        xmlNode.init(context, args);
        xmlNode.callInit(args, block);
        assert xmlNode.node != null;
        if (block.isGiven()) block.call(context, xmlNode);
        return xmlNode;
    }

    /**
     * Initialize the object from Ruby arguments.  Should be
     * overridden by subclasses.  Should check for a minimum number of
     * args but not for an exact number.  Any extra args will then be
     * passed to 'initialize'.  The way 'new' and this 'init' function
     * interact means that subclasses cannot arbitrarily change the
     * require aruments by defining an 'initialize' method.  This is
     * how the C libxml wrapper works also.
     *
     * As written it performs initialization for a new Element with
     * the given <code>name</code> within the document
     * <code>doc</code>.  So XmlElement need not override this.  This
     * implementation cannot be moved to XmlElement however, because
     * subclassing XmlNode must result in something that behaves much
     * like XmlElement.
     */
    protected void init(ThreadContext context, IRubyObject[] args) {
        if (args.length < 2)
            throw context.getRuntime().newArgumentError(args.length, 2);

        IRubyObject name = args[0];
        IRubyObject doc = args[1];

        Document document = asXmlNode(context, doc).getOwnerDocument();
        if (document == null) {
            throw getRuntime().newArgumentError("node must have owner document");
        }

        Element element;
        String node_name = rubyStringToString(name);
        String prefix = NokogiriHelpers.getPrefix(node_name);
        String namespace_uri = null;
        if (document.getDocumentElement() != null) {
            namespace_uri = document.getDocumentElement().lookupNamespaceURI(prefix);
        }
        element = document.createElementNS(namespace_uri, node_name);
        setNode(context, element);
    }

    /**
     * Set the underlying node of this node to the underlying node of
     * <code>otherNode</code>.
     *
     * FIXME: also update the cached node?
     */
    protected void assimilateXmlNode(ThreadContext context, IRubyObject otherNode) {
        XmlNode toAssimilate = asXmlNode(context, otherNode);

        this.node = toAssimilate.node;
        content = null;         // clear cache
    }

    /**
     * See org.w3.dom.Node#normalize.
     */
    public void normalize() {
        node.normalize();
    }

    public Node getNode() {
        return node;
    }

    public static Node getNodeFromXmlNode(ThreadContext context, IRubyObject xmlNode) {
        return asXmlNode(context, xmlNode).node;
    }

    protected String indentString(IRubyObject indentStringObject, String xml) {
        String[] lines = xml.split("\n");

        if(lines.length <= 1) return xml;

        String[] resultLines  = new String[lines.length];

        String curLine;
        boolean closingTag = false;
        String indentString = rubyStringToString(indentStringObject);
        int lengthInd = indentString.length();
        StringBuilder curInd = new StringBuilder();

        resultLines[0] = lines[0];

        for(int i = 1; i < lines.length; i++) {

            curLine = lines[i].trim();

            if(curLine.length() == 0) continue;

            if(curLine.startsWith("</")) {
                closingTag = true;
                curInd.setLength(max(0,curInd.length() - lengthInd));
            }

            resultLines[i] = curInd.toString() + curLine;

            if(!curLine.endsWith("/>") && !closingTag) {
                curInd.append(indentString);
            }

            closingTag = false;
        }

        StringBuilder result = new StringBuilder();
        for(int i = 0; i < resultLines.length; i++) {
            result.append(resultLines[i]).append('\n');
        }

        return result.toString();
    }

    public boolean isComment() { return false; }

    public boolean isElement() {
        if (node instanceof Element) return true; // in case of subclassing
        else return false;
    }

    public boolean isProcessingInstruction() { return false; }

    /**
     * Return the string value of the attribute <code>key</code> or
     * nil.
     *
     * Only applies where the underlying Node is an Element node, but
     * implemented here in XmlNode because not all nodes with
     * underlying Element nodes subclass XmlElement, such as the DTD
     * declarations like XmlElementDecl.
     */
    protected IRubyObject getAttribute(ThreadContext context, String key) {
        return getAttribute(context.getRuntime(), key);
    }

    protected IRubyObject getAttribute(Ruby runtime, String key) {
        String value = getAttribute(key);
        return nonEmptyStringOrNil(runtime, value);
    }

    protected String getAttribute(String key) {
        if (node.getNodeType() != Node.ELEMENT_NODE) return null;

        String value = ((Element)node).getAttribute(key);
        return value.length() == 0 ? null : value;
    }

    /**
     * This method should be called after a node has been adopted in a new
     * document. This method will ensure that the node is renamed with the
     * appriopriate NS uri. First the prefix of the node is extracted, then is
     * used to lookup the namespace uri in the new document starting at the
     * current node and traversing the ancestors. If the namespace uri wasn't
     * empty (or null) all children and the node has attributes and/or children
     * then the algorithm is recursively applied to the children.
     */
    public void relink_namespace(ThreadContext context) {
        if (!(node instanceof Element)) {
            return;
        }

        Element e = (Element) node;

        // disable error checking to prevent lines like the following
        // from throwing a `NAMESPACE_ERR' exception:
        // Nokogiri::XML::DocumentFragment.parse("<o:div>a</o:div>")
        // since the `o' prefix isn't defined anywhere.
        e.getOwnerDocument().setStrictErrorChecking(false);

        String prefix = e.getPrefix();
        String nsURI = e.lookupNamespaceURI(prefix);
        this.node = NokogiriHelpers.renameNode(e, nsURI, e.getNodeName());

        if (nsURI == null || nsURI == "") {
            return;
        }

        String currentPrefix = e.getParentNode().lookupPrefix(nsURI);
        String currentURI = e.getParentNode().lookupNamespaceURI(prefix);
        boolean isDefault = e.getParentNode().isDefaultNamespace(nsURI);

        // add xmlns attribute if this is a new root node or if the node's
        // namespace isn't a default namespace in the new document
        if (e.getParentNode().getNodeType() == Node.DOCUMENT_NODE) {
          // this is the root node, so we must set the namespaces attributes
          // anyway
          e.setAttribute(prefix == null ? "xmlns":"xmlns:"+prefix, nsURI);
        } else if (prefix == null) {
           if (!isDefault)
             // this is a default namespace but isn't the default where this
             // node is being added
             e.setAttribute("xmlns", nsURI);
        } else if (currentPrefix != prefix || currentURI != nsURI) {
          // this is a prefixed namespace but doens't have the same prefix or
          // the prefix is set to a diffent URI
          e.setAttribute("xmlns:"+prefix, nsURI);
        }

        if (e.hasAttributes()) {
            NamedNodeMap attrs = e.getAttributes();

            for (int i = 0; i < attrs.getLength(); i++) {
                Attr attr = (Attr) attrs.item(i);
                String attrPrefix = attr.getPrefix();
                if (attrPrefix == null) {
                    attrPrefix = NokogiriHelpers.getPrefix(attr.getNodeName());
                }
                String nodeName = attr.getNodeName();
                String nsUri;
                if ("xml".equals(attrPrefix)) {
                    nsUri = "http://www.w3.org/XML/1998/namespace";
                } else if ("xmlns".equals(attrPrefix) || nodeName.equals("xmlns")) {
                    nsUri = "http://www.w3.org/2000/xmlns/";
                } else {
                    nsUri = attr.lookupNamespaceURI(attrPrefix);
                }

                if (nsUri == e.getNamespaceURI()) {
                    nsUri = null;
                }

                if (!(nsUri == null || "".equals(nsUri) || "http://www.w3.org/XML/1998/namespace".equals(nsUri))) {
                    // Create a new namespace object and add it to the document
                    // namespace cache.
                    // TODO: why do we need the namespace cache ?
                    XmlNamespace.createFromAttr(context.getRuntime(), attr);
                }
                NokogiriHelpers.renameNode(attr, nsUri, nodeName);
            }
        }

        if (this.node.hasChildNodes()) {
            XmlNodeSet nodeSet = (XmlNodeSet)(children(context));
            nodeSet.relink_namespace(context);
        }
    }

    // Users might extend XmlNode. This method works for such a case.
    public void accept(ThreadContext context, SaveContextVisitor visitor) {
        visitor.enter(node);
        XmlNodeSet xmlNodeSet = (XmlNodeSet) children(context);
        if (xmlNodeSet.length() > 0) {
            RubyArray array = (RubyArray) xmlNodeSet.to_a(context);
            for(int i = 0; i < array.getLength(); i++) {
                Object item = array.get(i);
                if (item instanceof XmlNode) {
                  XmlNode cur = (XmlNode) item;
                  cur.accept(context, visitor);
                } else if (item instanceof XmlNamespace) {
                    XmlNamespace cur = (XmlNamespace)item;
                    cur.accept(context, visitor);
                }
            }
        }
        visitor.leave(node);
    }

    public void setName(IRubyObject name) {
        this.name = name;
    }

    public void setDocument(ThreadContext context, IRubyObject doc) {
        this.doc = doc;

        setDocumentAndDecorate(context, this, doc);
    }

    // shared logic with XmlNodeSet
    static void setDocumentAndDecorate(ThreadContext context, RubyObject self, IRubyObject doc) {
        self.setInstanceVariable("@document", doc);
        if (doc != null) {
            Helpers.invoke(context, doc, "decorate", self);
        }
    }

    public void setNode(ThreadContext context, Node node) {
        this.node = node;

        decorate(context);

        if (this instanceof XmlAttr) {
            ((XmlAttr)this).setNamespaceIfNecessary(context.getRuntime());
        }
    }

    public void updateNodeNamespaceIfNecessary(ThreadContext context, XmlNamespace ns) {
        String oldPrefix = this.node.getPrefix();
        String uri = rubyStringToString(ns.href(context));

        /*
         * Update if both prefixes are null or equal
         */
        boolean update = (oldPrefix == null && ns.prefix(context).isNil()) ||
                            (oldPrefix != null && !ns.prefix(context).isNil()
                && oldPrefix.equals(rubyStringToString(ns.prefix(context))));

        if(update) {
            this.node = NokogiriHelpers.renameNode(this.node, uri, this.node.getNodeName());
        }
    }

    protected IRubyObject getNodeName(ThreadContext context) {
        if (name != null) return name;

        String str = null;
        if (node != null) {
            str = node.getNodeName();
            str = NokogiriHelpers.getLocalPart(str);
        }
        if (str == null) str = "";
        if (str.startsWith("#")) str = str.substring(1);  // eliminates '#'
        return name = NokogiriHelpers.stringOrBlank(context.getRuntime(), str);
    }

    /**
     * Add a namespace definition to this node.  To the underlying
     * node, add an attribute of the form
     * <code>xmlns:prefix="uri"</code>.
     */
    @JRubyMethod(name = {"add_namespace_definition", "add_namespace"})
    public IRubyObject add_namespace_definition(ThreadContext context,
                                                IRubyObject prefix,
                                                IRubyObject href) {
        String prefixString = rubyStringToString(prefix);
        String hrefString ;

        // try to search the namespace first
        if (href.isNil()) {
            hrefString = this.findNamespaceHref(context, rubyStringToString(prefix));
            if (hrefString == null) {
                return context.nil;
            }
            href = context.getRuntime().newString(hrefString);
        } else {
            hrefString = rubyStringToString(href);
        }

        NokogiriNamespaceCache nsCache = NokogiriHelpers.getNamespaceCacheFormNode(node);
        XmlNamespace cachedNamespace = nsCache.get(prefixString, hrefString);

        if (cachedNamespace != null) return cachedNamespace;

        Node namespaceOwner;
        if (node.getNodeType() == Node.ELEMENT_NODE) {
            namespaceOwner = node;
            Element element = (Element) node;
            // adds namespace as node's attribute
            final String uri = "http://www.w3.org/2000/xmlns/";
            String qName =
                prefix.isNil() ? "xmlns" : "xmlns:" + prefixString;

            element.setAttributeNS(uri, qName, hrefString);
        }
        else if (node.getNodeType() == Node.ATTRIBUTE_NODE) namespaceOwner = ((Attr)node).getOwnerElement();
        else namespaceOwner = node.getParentNode();
        XmlNamespace ns = XmlNamespace.createFromPrefixAndHref(namespaceOwner, prefix, href);
        if (node != namespaceOwner) {

            this.node = NokogiriHelpers.renameNode(node, ns.getHref(), ns.getPrefix() + ":" + node.getLocalName());
        }
        updateNodeNamespaceIfNecessary(context, ns);

        return ns;
    }

    @JRubyMethod(name = {"attribute", "attr"})
    public IRubyObject attribute(ThreadContext context, IRubyObject name){
        NamedNodeMap attrs = this.node.getAttributes();
        Node attr = attrs.getNamedItem(rubyStringToString(name));
        if(attr == null) {
            return  context.getRuntime().getNil();
        }
        return getCachedNodeOrCreate(context.getRuntime(), attr);
    }

    @JRubyMethod
    public IRubyObject attribute_nodes(ThreadContext context) {
        NamedNodeMap nodeMap = this.node.getAttributes();

        Ruby ruby = context.getRuntime();
        if(nodeMap == null){
            return ruby.newEmptyArray();
        }

        RubyArray attr = ruby.newArray();

        for(int i = 0; i < nodeMap.getLength(); i++) {
            if ((doc instanceof HtmlDocument) || !NokogiriHelpers.isNamespace(nodeMap.item(i))) {
                attr.append(getCachedNodeOrCreate(context.getRuntime(), nodeMap.item(i)));
            }
        }

        return attr;
    }

    @JRubyMethod
    public IRubyObject attribute_with_ns(ThreadContext context, IRubyObject name, IRubyObject namespace) {
        String namej = rubyStringToString(name);
        String nsj = (namespace.isNil()) ? null : rubyStringToString(namespace);

        Node el = this.node.getAttributes().getNamedItemNS(nsj, namej);

        if(el == null) {
            return context.getRuntime().getNil();
        }
        return NokogiriHelpers.getCachedNodeOrCreate(context.getRuntime(), el);
    }

    @JRubyMethod(name = "blank?")
    public IRubyObject blank_p(ThreadContext context) {
        // according to libxml doc,
        // a node is blank if if it is a Text or CDATA node consisting of whitespace only
        if (node.getNodeType() == Node.TEXT_NODE || node.getNodeType() == Node.CDATA_SECTION_NODE) {
            String data = node.getTextContent();
            return context.runtime.newBoolean(data == null || isBlank(data));
        }
        return context.runtime.getFalse();
    }

    @JRubyMethod
    public IRubyObject child(ThreadContext context) {
        return getCachedNodeOrCreate(context.getRuntime(), node.getFirstChild());
    }

    @JRubyMethod
    public IRubyObject children(ThreadContext context) {
        XmlNodeSet xmlNodeSet = XmlNodeSet.newEmptyNodeSet(context);

        NodeList nodeList = node.getChildNodes();
        if (nodeList.getLength() > 0) {
            xmlNodeSet.setNodeList(nodeList); // initializes @document from first node
        }
        else { // TODO this is very ripe for refactoring
            setDocumentAndDecorate(context, xmlNodeSet, doc);
        }

        return xmlNodeSet;
    }

    @JRubyMethod
    public IRubyObject first_element_child(ThreadContext context) {
        List<Node> elementNodes = new ArrayList<Node>();
        addElements(node, elementNodes, true);
        if (elementNodes.size() == 0) return context.getRuntime().getNil();
        return getCachedNodeOrCreate(context.getRuntime(), elementNodes.get(0));
    }

    @JRubyMethod
    public IRubyObject last_element_child(ThreadContext context) {
        List<Node> elementNodes = new ArrayList<Node>();
        addElements(node, elementNodes, false);
        if (elementNodes.size() == 0) return context.getRuntime().getNil();
        return getCachedNodeOrCreate(context.getRuntime(), elementNodes.get(elementNodes.size()-1));
    }

    @JRubyMethod(name = {"element_children", "elements"})
    public IRubyObject element_children(ThreadContext context) {
        List<Node> elementNodes = new ArrayList<Node>();
        addElements(node, elementNodes, false);
        IRubyObject[] array = NokogiriHelpers.nodeArrayToArray(context.runtime,
                                                               elementNodes.toArray(new Node[0]));
        XmlNodeSet xmlNodeSet = XmlNodeSet.newXmlNodeSet(context, array);
        return xmlNodeSet;
    }

    private void addElements(Node n, List<Node> nodes, boolean isFirstOnly) {
        NodeList children = n.getChildNodes();
        if (children.getLength() == 0) return;
        for (int i=0; i< children.getLength(); i++) {
            Node child = children.item(i);
            if (child.getNodeType() == Node.ELEMENT_NODE) {
                nodes.add(child);
                if (isFirstOnly) return;
            }
        }
    }

    /**
     * call-seq:
     *  compare(other)
     *
     * Compare this Node to +other+ with respect to their Document
     */
    @JRubyMethod(visibility=Visibility.PRIVATE)
    public IRubyObject compare(ThreadContext context, IRubyObject other) {
        if (!(other instanceof XmlNode)) {
            return context.getRuntime().newFixnum(-2);
        }

        Node otherNode = asXmlNode(context, other).node;

        // Do not touch this if, if it's not for a good reason.
        if (node.getNodeType() == Node.DOCUMENT_NODE ||
           otherNode.getNodeType() == Node.DOCUMENT_NODE) {
            return context.getRuntime().newFixnum(-1);
        }

        try{
            int res = node.compareDocumentPosition(otherNode);
            if ((res & FIRST_PRECEDES_SECOND) == FIRST_PRECEDES_SECOND) {
                return context.getRuntime().newFixnum(-1);
            } else if ((res & SECOND_PRECEDES_FIRST) == SECOND_PRECEDES_FIRST) {
                return context.getRuntime().newFixnum(1);
            } else if (res == IDENTICAL_ELEMENTS) {
                return context.getRuntime().newFixnum(0);
            }

            return context.getRuntime().newFixnum(-2);
        } catch (Exception ex) {
            return context.getRuntime().newFixnum(-2);
        }
    }

    /**
     * TODO: this is a stub implementation.  It's not clear what
     * 'in_context' is supposed to do.  Also should take
     * <code>options</code> into account.
     */
    @JRubyMethod(required = 2, visibility = Visibility.PRIVATE)
    public IRubyObject in_context(ThreadContext context,
                                  IRubyObject str,
                                  IRubyObject options) {
        RubyModule klass;
        XmlDomParserContext ctx;
        InputStream istream;
        XmlDocument document;

        IRubyObject d = document(context);
        Ruby runtime = context.getRuntime();
        if (d != null && d instanceof XmlDocument) {
            document = (XmlDocument)d;
        } else {
            return runtime.getNil();
        }

        if (document instanceof HtmlDocument) {
            klass = getNokogiriClass(runtime, "Nokogiri::HTML::Document");
            ctx = new HtmlDomParserContext(runtime, options);
            ((HtmlDomParserContext)ctx).enableDocumentFragment();
            istream = new ByteArrayInputStream((rubyStringToString(str)).getBytes());
        } else {
            klass = getNokogiriClass(runtime, "Nokogiri::XML::Document");
            ctx = new XmlDomParserContext(runtime, options);
            String input = rubyStringToString(str);
            istream = new ByteArrayInputStream(input.getBytes());
        }

        ctx.setInputSource(istream);
        // TODO: for some reason, document.getEncoding() can be null or nil (don't know why)
        // run `test_parse_with_unparented_html_text_context_node' few times to see this happen
        if (document instanceof HtmlDocument && !(document.getEncoding() == null || document.getEncoding().isNil())) {
        	HtmlDomParserContext htmlCtx= (HtmlDomParserContext) ctx;
        	htmlCtx.setEncoding(document.getEncoding().asJavaString());
        }

        XmlDocument doc = ctx.parse(context, klass, runtime.getNil());

        RubyArray documentErrors = getErrorArray(document);
        RubyArray docErrors = getErrorArray(doc);
        if (isErrorIncreased(documentErrors, docErrors)) {
            for (int i = 0; i < docErrors.getLength(); i++) {
                documentErrors.add(docErrors.entry(i));
            }
            document.setInstanceVariable("@errors", documentErrors);
            XmlNodeSet xmlNodeSet = XmlNodeSet.newXmlNodeSet(context, new IRubyObject[0]);
            return xmlNodeSet;
        }

        // The first child might be document type node (dtd declaration).
        // XmlNodeSet to be return should not have dtd decl in its list.
        Node first;
        if (doc.node.getFirstChild().getNodeType() == Node.DOCUMENT_TYPE_NODE) {
            first = doc.node.getFirstChild().getNextSibling();
        } else {
            first = doc.node.getFirstChild();
        }

        IRubyObject[] nodes = new IRubyObject[]{NokogiriHelpers.getCachedNodeOrCreate(runtime, first)};
        XmlNodeSet xmlNodeSet = XmlNodeSet.newXmlNodeSet(context, nodes);
        return xmlNodeSet;
    }

    private RubyArray getErrorArray(XmlDocument document) {
        IRubyObject obj = document.getInstanceVariable("@errors");
        if (obj != null && obj instanceof RubyArray) {
            return (RubyArray)obj;
        }
        return RubyArray.newArray(document.getRuntime());
    }

    private boolean isErrorIncreased(RubyArray baseErrors, RubyArray createdErrors) {
        int length = ((RubyArray) createdErrors.op_diff(baseErrors)).size();
        return length > 0;
    }

    @JRubyMethod(name = {"content", "text", "inner_text"})
    public IRubyObject content(ThreadContext context) {
        return stringOrNil(context.getRuntime(), getContentImpl());
    }

    public CharSequence getContentImpl() {
        if (!node.hasChildNodes() && node.getNodeValue() == null &&
            (node.getNodeType() == Node.TEXT_NODE || node.getNodeType() == Node.CDATA_SECTION_NODE)) {
            return null;
        }
        CharSequence textContent;
        if (this instanceof XmlDocument) {
            Node node = ((Document)this.node).getDocumentElement();
            if (node == null) {
                textContent = "";
            } else {
                Node documentElement = ((Document) this.node).getDocumentElement();
                textContent = getTextContentRecursively(new StringBuilder(), documentElement);
            }
        } else {
            textContent = getTextContentRecursively(new StringBuilder(), node);
        }
        // textContent = NokogiriHelpers.convertEncodingByNKFIfNecessary(context, (XmlDocument) document(context), textContent);
        return textContent;
    }

    private StringBuilder getTextContentRecursively(StringBuilder buffer, Node currentNode) {
        CharSequence textContent = currentNode.getNodeValue();
        if (textContent != null && NokogiriHelpers.shouldDecode(currentNode)) {
            textContent = NokogiriHelpers.decodeJavaString(textContent);
        }
        if (textContent != null) buffer.append(textContent);
        NodeList children = currentNode.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node child = children.item(i);
            if (hasTextContent(child)) getTextContentRecursively(buffer, child);
        }
        return buffer;
    }

    private boolean hasTextContent(Node child) {
        return child.getNodeType() != Node.COMMENT_NODE && child.getNodeType() != Node.PROCESSING_INSTRUCTION_NODE;
    }

    @JRubyMethod
    public final IRubyObject document(ThreadContext context) {
        return document(context.runtime);
    }

    IRubyObject document(final Ruby runtime) {
        if (doc == null) {
            doc = (XmlDocument) node.getOwnerDocument().getUserData(NokogiriHelpers.CACHED_NODE);
        }
        if (doc == null) {
            doc = getCachedNodeOrCreate(runtime, node.getOwnerDocument());
            node.getOwnerDocument().setUserData(NokogiriHelpers.CACHED_NODE, doc, null);
        }
        return doc;
    }

    public IRubyObject dup() {
        return dup_implementation(getMetaClass().getClassRuntime(), true);
    }

    @JRubyMethod
    public IRubyObject dup(ThreadContext context) {
        return dup_implementation(context, true);
    }

    @JRubyMethod
    public IRubyObject dup(ThreadContext context, IRubyObject depth) {
        boolean deep = depth instanceof RubyInteger && RubyFixnum.fix2int(depth) != 0;
        return dup_implementation(context, deep);
    }

    protected final IRubyObject dup_implementation(ThreadContext context, boolean deep) {
       return dup_implementation(context.getRuntime(), deep);
    }

    protected IRubyObject dup_implementation(Ruby runtime, boolean deep) {
        XmlNode clone;
        try {
            clone = (XmlNode) clone();
        } catch (CloneNotSupportedException e) {
            throw runtime.newRuntimeError(e.toString());
        }
        Node newNode = node.cloneNode(deep);
        clone.node = newNode;
        return clone;
    }

    public static RubyString encode_special_chars(ThreadContext context, IRubyObject string) {
        CharSequence str = NokogiriHelpers.encodeJavaString( rubyStringToString(string) );
        return RubyString.newString(context.getRuntime(), str);
    }

    /**
     * Instance method version of the above static method.
     */
    @JRubyMethod(name="encode_special_chars")
    public IRubyObject i_encode_special_chars(ThreadContext context,
                                              IRubyObject string) {
        return encode_special_chars(context, string);
    }

    /**
     * Get the attribute at the given key, <code>key</code>.
     * Assumes that this node has attributes (i.e. that key? returned
     * true).
     */
    @JRubyMethod(visibility = Visibility.PRIVATE)
    public IRubyObject get(ThreadContext context, IRubyObject rbkey) {
        if (node instanceof Element) {
            if (rbkey == null || rbkey.isNil()) context.getRuntime().getNil();
            String key = rubyStringToString(rbkey);
            Element element = (Element) node;
            if (!element.hasAttribute(key)) return context.getRuntime().getNil();
            String value = element.getAttribute(key);
            return stringOrNil(context.getRuntime(), value);
        }
        return context.getRuntime().getNil();
    }

    /**
     * Returns the owner document, checking if this node is the
     * document, or returns null if there is no owner.
     */
    protected Document getOwnerDocument() {
        if (node.getNodeType() == Node.DOCUMENT_NODE) {
            return (Document) node;
        } else {
            return node.getOwnerDocument();
        }
    }

    @JRubyMethod
    public IRubyObject internal_subset(ThreadContext context) {
        Document document = getOwnerDocument();

        if(document == null) {
            return context.getRuntime().getNil();
        }

        XmlDocument xdoc =
            (XmlDocument) getCachedNodeOrCreate(context.getRuntime(), document);
        IRubyObject xdtd = xdoc.getInternalSubset(context);
        return xdtd;
    }

    @JRubyMethod
    public IRubyObject create_internal_subset(ThreadContext context,
                                              IRubyObject name,
                                              IRubyObject external_id,
                                              IRubyObject system_id) {
        IRubyObject subset = internal_subset(context);
        if (!subset.isNil()) {
            throw context.getRuntime()
                .newRuntimeError("Document already has internal subset");
        }

        Document document = getOwnerDocument();
        if(document == null) {
            return context.getRuntime().getNil();
        }

        XmlDocument xdoc =
            (XmlDocument) getCachedNodeOrCreate(context.getRuntime(), document);
        IRubyObject xdtd = xdoc.createInternalSubset(context, name,
                                                     external_id, system_id);
        return xdtd;
    }

    @JRubyMethod
    public IRubyObject external_subset(ThreadContext context) {
        Document document = getOwnerDocument();

        if (document == null) {
            return context.getRuntime().getNil();
        }

        XmlDocument xdoc =
            (XmlDocument) getCachedNodeOrCreate(context.getRuntime(), document);
        IRubyObject xdtd = xdoc.getExternalSubset(context);
        return xdtd;
    }

    @JRubyMethod
    public IRubyObject create_external_subset(ThreadContext context,
                                              IRubyObject name,
                                              IRubyObject external_id,
                                              IRubyObject system_id) {
        IRubyObject subset = external_subset(context);
        if (!subset.isNil()) {
            throw context.getRuntime()
                .newRuntimeError("Document already has external subset");
        }

        Document document = getOwnerDocument();
        if(document == null) {
            return context.getRuntime().getNil();
        }
        XmlDocument xdoc = (XmlDocument) getCachedNodeOrCreate(context.getRuntime(), document);
        IRubyObject xdtd = xdoc.createExternalSubset(context, name, external_id, system_id);
        return xdtd;
    }

    /**
     * Test if this node has an attribute named <code>rbkey</code>.
     * Overridden in XmlElement.
     */
    @JRubyMethod(name = {"key?", "has_attribute?"})
    public IRubyObject key_p(ThreadContext context, IRubyObject rbkey) {
        if (node instanceof Element) {
            String key = rubyStringToString(rbkey);
            Element element = (Element) node;
            if (element.hasAttribute(key)) {
                return context.getRuntime().getTrue();
            } else {
                NamedNodeMap namedNodeMap = element.getAttributes();
                for (int i=0; i<namedNodeMap.getLength(); i++) {
                    Node n = namedNodeMap.item(i);
                    if (key.equals(n.getLocalName())) {
                        return context.getRuntime().getTrue();
                    }
                }
            }
            return context.getRuntime().getFalse();
        } else {
            return context.getRuntime().getNil();
        }
    }

    @JRubyMethod
    public IRubyObject namespace(ThreadContext context) {
        Ruby runtime = context.getRuntime();
        if (doc instanceof HtmlDocument) return runtime.getNil();
        NokogiriNamespaceCache nsCache = NokogiriHelpers.getNamespaceCacheFormNode(node);
        String namespaceURI = node.getNamespaceURI();
        if (namespaceURI == null || namespaceURI == "") {
            return runtime.getNil();
        }

        String prefix = node.getPrefix();
        XmlNamespace namespace = nsCache.get(prefix == null ? "" : prefix, namespaceURI);
        if (namespace == null || namespace.isEmpty()) {
          // if it's not in the cache, create an unowned, uncached namespace and
          // return that. XmlReader can't insert namespaces into the cache, so
          // this is necessary for XmlReader to work correctly.
          namespace = new XmlNamespace(runtime, getNokogiriClass(runtime, "Nokogiri::XML::Namespace"));
          IRubyObject rubyPrefix = NokogiriHelpers.stringOrNil(runtime, prefix);
          IRubyObject rubyUri = NokogiriHelpers.stringOrNil(runtime, namespaceURI);
          namespace.init(null, rubyPrefix, rubyUri, doc);
        }

        return namespace;
    }

    /**
     * Return an array of XmlNamespace nodes based on the attributes
     * of this node.
     */
    @JRubyMethod
    public IRubyObject namespace_definitions(ThreadContext context) {
        // don't use namespace_definitions cache anymore since
        // namespaces might be deleted. Reflecting the result of
        // namesapce removals is complicated, so the cache might not be
        // updated.
        Ruby ruby = context.getRuntime();
        RubyArray namespace_definitions = ruby.newArray();
        if (doc == null) return namespace_definitions;
        if (doc instanceof HtmlDocument) return namespace_definitions;
        List<XmlNamespace> namespaces = ((XmlDocument)doc).getNamespaceCache().get(node);
        for (XmlNamespace namespace : namespaces) {
            namespace_definitions.append(namespace);
        }

        return namespace_definitions;
    }

    /**
     * Return an array of XmlNamespace nodes defined on this node and
     * on any ancestor node.
     */
    @JRubyMethod
    public IRubyObject namespace_scopes(ThreadContext context) {
        RubyArray scoped_namespaces = context.getRuntime().newArray();
        if (doc == null) return scoped_namespaces;
        if (doc instanceof HtmlDocument) return scoped_namespaces;

        Node previousNode;
        if (node.getNodeType() == Node.ELEMENT_NODE) {
            previousNode = node;
        } else if (node.getNodeType() == Node.ATTRIBUTE_NODE) {
            previousNode = ((Attr)node).getOwnerElement();
        } else {
            previousNode = findPreviousElement(node);
        }
        if (previousNode == null) return scoped_namespaces;

        List<String> prefixes_in_scope = new ArrayList<String>();
        NokogiriNamespaceCache nsCache = NokogiriHelpers.getNamespaceCacheFormNode(previousNode);
        for (Node previous=previousNode; previous != null; ) {
            List<XmlNamespace> namespaces = nsCache.get(previous);
            for (XmlNamespace namespace : namespaces) {
                if (prefixes_in_scope.contains(namespace.getPrefix())) continue;
                scoped_namespaces.append(namespace);
                prefixes_in_scope.add(namespace.getPrefix());
            }
            previous = findPreviousElement(previous);
        }
        return scoped_namespaces;
    }

    private Node findPreviousElement(Node n) {
        Node previous = n.getPreviousSibling() == null ? n.getParentNode() : n.getPreviousSibling();
        if (previous == null || previous.getNodeType() == Node.DOCUMENT_NODE) return null;
        if (previous.getNodeType() == Node.ELEMENT_NODE) {
            return previous;
        } else {
            return findPreviousElement(previous);
        }
    }

    @JRubyMethod(name="namespaced_key?")
    public IRubyObject namespaced_key_p(ThreadContext context, IRubyObject elementLName, IRubyObject namespaceUri) {
        return this.attribute_with_ns(context, elementLName, namespaceUri).isNil() ?
            context.getRuntime().getFalse() : context.getRuntime().getTrue();
    }

    protected void setContent(IRubyObject content) {
        String javaContent = rubyStringToString(content);
        node.setTextContent(javaContent);
        if (javaContent == null || javaContent.length() == 0) return;
        if (node.getNodeType() == Node.TEXT_NODE || node.getNodeType() == Node.CDATA_SECTION_NODE) return;
        if (node.getFirstChild() != null) {
            node.getFirstChild().setUserData(NokogiriHelpers.ENCODED_STRING, true, null);
        }
    }

    private void setContent(String content) {
        node.setTextContent(content);
        this.content = null;    // clear cache
    }

    @JRubyMethod(name = "native_content=")
    public IRubyObject native_content_set(ThreadContext context, IRubyObject content) {
        setContent(content);
        return content;
    }

    @JRubyMethod
    public IRubyObject lang(ThreadContext context) {
        IRubyObject currentObj = this ;
        while (!currentObj.isNil()) {
            XmlNode currentNode = asXmlNode(context, currentObj);
            IRubyObject lang = currentNode.getAttribute(context.getRuntime(), "xml:lang");
            if (!lang.isNil()) { return lang ; }

            currentObj = currentNode.parent(context);
        }
        return context.nil ;
    }

    @JRubyMethod(name = "lang=")
    public IRubyObject set_lang(ThreadContext context, IRubyObject lang) {
        setAttribute(context, "xml:lang", rubyStringToString(lang));
        return context.nil ;
    }

    /**
     * @param args {IRubyObject io,
     *              IRubyObject encoding,
     *              IRubyObject indentString,
     *              IRubyObject options}
     */
    @JRubyMethod(required=4, visibility=Visibility.PRIVATE)
    public IRubyObject native_write_to(ThreadContext context, IRubyObject[] args) {

        IRubyObject io = args[0];
        IRubyObject encoding = args[1];
        IRubyObject indentString = args[2];
        IRubyObject options = args[3];

        String encString = encoding.isNil() ? null : rubyStringToString(encoding);

        SaveContextVisitor visitor =
            new SaveContextVisitor(RubyFixnum.fix2int(options), rubyStringToString(indentString), encString, isHtmlDoc(context), isFragment(), 0);
        accept(context, visitor);

        final IRubyObject rubyString;
        if (NokogiriHelpers.isUTF8(encString)) {
            rubyString = convertString(context.getRuntime(), visitor.getInternalBuffer());
        } else {
            ByteBuffer bytes = convertEncoding(Charset.forName(encString), visitor.getInternalBuffer());
            ByteList str = new ByteList(bytes.array(), bytes.arrayOffset(), bytes.remaining());
            rubyString = RubyString.newString(context.getRuntime(), str);
        }
        Helpers.invoke(context, io, "write", rubyString);

        return io;
    }

    private boolean isHtmlDoc(ThreadContext context) {
        return document(context).getMetaClass().isKindOfModule(getNokogiriClass(context.getRuntime(), "Nokogiri::HTML::Document"));
    }

    private boolean isFragment() {
        if (node instanceof DocumentFragment) return true;
        if (node.getParentNode() != null && node.getParentNode() instanceof DocumentFragment) return true;
        return false;
    }

    @JRubyMethod(name = {"next_sibling", "next"})
    public IRubyObject next_sibling(ThreadContext context) {
        return getCachedNodeOrCreate(context.getRuntime(), node.getNextSibling());
    }

    @JRubyMethod(name = {"previous_sibling", "previous"})
    public IRubyObject previous_sibling(ThreadContext context) {
        return getCachedNodeOrCreate(context.getRuntime(), node.getPreviousSibling());
    }

    @JRubyMethod(meta = true, rest = true)
    public static IRubyObject new_from_str(ThreadContext context,
                                           IRubyObject cls,
                                           IRubyObject[] args) {
        XmlDocument doc = (XmlDocument) XmlDocument.read_memory(context, args);
        return doc.root(context);
    }

    @JRubyMethod(name = {"node_name", "name"})
    public IRubyObject node_name(ThreadContext context) {
        return getNodeName(context);
    }

    @JRubyMethod(name = {"node_name=", "name="})
    public IRubyObject node_name_set(ThreadContext context, IRubyObject nodeName) {
        String newName = rubyStringToString(nodeName);
        this.node = NokogiriHelpers.renameNode(node, null, newName);
        setName(nodeName);
        return this;
    }

    @JRubyMethod(visibility = Visibility.PRIVATE)
    public IRubyObject set(ThreadContext context, IRubyObject rbkey, IRubyObject rbval) {
        if (node instanceof Element) {
            setAttribute(context, rubyStringToString(rbkey), rubyStringToString(rbval));
            return this;
        } else {
            return rbval;
        }
    }

    private void setAttribute(ThreadContext context, String key, String val) {
        Element element = (Element) node;

        String uri = null;
        int colonIndex = key.indexOf(":");
        if (colonIndex > 0) {
            String prefix = key.substring(0, colonIndex);
            if (prefix.equals("xml")) {
                uri = "http://www.w3.org/XML/1998/namespace";
            } else if (prefix.equals("xmlns")) {
                uri = "http://www.w3.org/2000/xmlns/";
            } else {
                uri = node.lookupNamespaceURI(prefix);
            }
        }

        if (uri != null) {
            element.setAttributeNS(uri, key, val);
        } else {
            element.setAttribute(key, val);
        }
        clearXpathContext(node);
    }

    private String findNamespaceHref(ThreadContext context, String prefix) {
      XmlNode currentNode = this;
      while(currentNode != document(context)) {
        RubyArray namespaces = (RubyArray) currentNode.namespace_scopes(context);
        Iterator iterator = namespaces.iterator();
        while(iterator.hasNext()) {
          XmlNamespace namespace = (XmlNamespace) iterator.next();
          if (namespace.getPrefix().equals(prefix)) {
            return namespace.getHref();
          }
        }
        if (currentNode.parent(context).isNil()) {
            break;
        } else {
            currentNode = (XmlNode) currentNode.parent(context);
        }
      }
      return null;
    }

    @JRubyMethod
    public IRubyObject parent(ThreadContext context) {
        /*
         * Check if this node is the root node of the document.
         * If so, parent is the document.
         */
        if (node.getOwnerDocument() != null &&
            node.getOwnerDocument().getDocumentElement() == node) {
            return document(context);
        } else {
            return getCachedNodeOrCreate(context.getRuntime(), node.getParentNode());
        }
    }

    @JRubyMethod
    public IRubyObject path(ThreadContext context) {
        return RubyString.newString(context.getRuntime(), NokogiriHelpers.getNodeCompletePath(this.node));
    }

    @JRubyMethod
    public IRubyObject pointer_id(ThreadContext context) {
        return RubyFixnum.newFixnum(context.getRuntime(), this.node.hashCode());
    }

    @JRubyMethod(visibility=Visibility.PRIVATE)
    public IRubyObject set_namespace(ThreadContext context, IRubyObject namespace) {
        if (namespace.isNil()) {
            if (doc != null) {
                Node n = node;
                String prefix = n.getPrefix();
                String href = n.getNamespaceURI();
                ((XmlDocument)doc).getNamespaceCache().remove(prefix == null ? "" : prefix, href);
                this.node = NokogiriHelpers.renameNode(n, null, NokogiriHelpers.getLocalPart(n.getNodeName()));
            }
        } else {
            XmlNamespace ns = (XmlNamespace) namespace;
            String prefix = rubyStringToString(ns.prefix(context));
            String href = rubyStringToString(ns.href(context));

            // Assigning node = ...renameNode() or not seems to make no
            // difference.  Why not? -pmahoney

            // It actually makes a great deal of difference. renameNode()
            // will operate in place if it can, but sometimes it can't.
            // The node you passed in *might* come back as you expect, but
            // it might not. It's much safer to throw away the original
            // and keep the return value. -mbklein
            String new_name = NokogiriHelpers.newQName(prefix, node);
            this.node = NokogiriHelpers.renameNode(node, href, new_name);
        }

        clearXpathContext(getNode());

        return this;
    }

    @JRubyMethod(name = {"unlink", "remove"})
    public IRubyObject unlink(ThreadContext context) {
        final Node parent = node.getParentNode();
        if (parent != null) {
            parent.removeChild(node);
            clearXpathContext(parent);
        }
        return this;
    }

    /**
     * The C-library simply returns libxml2 magic numbers.  Here we
     * convert Java Xml nodes to the appropriate constant defined in
     * xml/node.rb.
     */
    @JRubyMethod(name = {"node_type", "type"})
    public IRubyObject node_type(ThreadContext context) {
        String type;
        switch (node.getNodeType()) {
        case Node.ELEMENT_NODE:
            if (this instanceof XmlElementDecl)
                type = "ELEMENT_DECL";
            else if (this instanceof XmlAttributeDecl)
                type = "ATTRIBUTE_DECL";
            else if (this instanceof XmlEntityDecl)
                type = "ENTITY_DECL";
            else
                type = "ELEMENT_NODE";
            break;
        case Node.ATTRIBUTE_NODE: type = "ATTRIBUTE_NODE"; break;
        case Node.TEXT_NODE: type = "TEXT_NODE"; break;
        case Node.CDATA_SECTION_NODE: type = "CDATA_SECTION_NODE"; break;
        case Node.ENTITY_REFERENCE_NODE: type = "ENTITY_REF_NODE"; break;
        case Node.ENTITY_NODE: type = "ENTITY_NODE"; break;
        case Node.PROCESSING_INSTRUCTION_NODE: type = "PI_NODE"; break;
        case Node.COMMENT_NODE: type = "COMMENT_NODE"; break;
        case Node.DOCUMENT_NODE:
            if (this instanceof HtmlDocument)
                type = "HTML_DOCUMENT_NODE";
            else
                type = "DOCUMENT_NODE";
            break;
        case Node.DOCUMENT_TYPE_NODE: type = "DOCUMENT_TYPE_NODE"; break;
        case Node.DOCUMENT_FRAGMENT_NODE: type = "DOCUMENT_FRAG_NODE"; break;
        case Node.NOTATION_NODE: type = "NOTATION_NODE"; break;
        default:
            return context.getRuntime().newFixnum(0);
        }

        return getNokogiriClass(context.getRuntime(), "Nokogiri::XML::Node").getConstant(type);
    }

    @JRubyMethod
    public IRubyObject line(ThreadContext context) {
        Node root = getOwnerDocument();
        int[] counter = new int[1];
        count(root, counter);
        return RubyFixnum.newFixnum(context.getRuntime(), counter[0]+1);
    }

    private boolean count(Node node, int[] counter) {
        if (node == this.node) {
            return true;
        }
        NodeList list = node.getChildNodes();
        for (int i=0; i<list.getLength(); i++) {
            Node n = list.item(i);
            if (n instanceof Text
                    && ((Text)n).getData().contains("\n")) {
                counter[0] += 1;
            }
            if (count(n, counter)) return true;
        }
        return false;
    }

    @JRubyMethod
    public IRubyObject next_element(ThreadContext context) {
        Node nextNode = node.getNextSibling();
        Ruby ruby = context.getRuntime();
        if (nextNode == null) return ruby.getNil();
        if (nextNode instanceof Element) {
            return getCachedNodeOrCreate(context.getRuntime(), nextNode);
        }
        Node deeper = nextNode.getNextSibling();
        if (deeper == null) return ruby.getNil();
        return getCachedNodeOrCreate(context.getRuntime(), deeper);
    }

    @JRubyMethod
    public IRubyObject previous_element(ThreadContext context) {
        Node prevNode = node.getPreviousSibling();
        Ruby ruby = context.getRuntime();
        if (prevNode == null) return ruby.getNil();
        if (prevNode instanceof Element) {
            return getCachedNodeOrCreate(context.getRuntime(), prevNode);
        }
        Node shallower = prevNode.getPreviousSibling();
        if (shallower == null) return ruby.getNil();
        return getCachedNodeOrCreate(context.getRuntime(), shallower);
    }

    protected enum AdoptScheme {
        CHILD, PREV_SIBLING, NEXT_SIBLING, REPLACEMENT
    }

    /**
     * Adopt XmlNode <code>other</code> into the document of
     * <code>this</code> using the specified scheme.
     */
    protected IRubyObject adoptAs(ThreadContext context, AdoptScheme scheme,
                                  IRubyObject other_) {
        XmlNode other = asXmlNode(context, other_);
        // this.doc might be null since this node can be empty node.
        if (this.doc != null) {
            other.setDocument(context, this.doc);
        }
        IRubyObject nodeOrTags = other;
        Node thisNode = node;
        Node otherNode = other.node;

         try {
            Document prev = otherNode.getOwnerDocument();
            Document doc = thisNode.getOwnerDocument();
            if (doc == null && thisNode instanceof Document) {
              // we are adding the new node to a new empty document
              doc = (Document) thisNode;
            }
            clearXpathContext(prev);
            clearXpathContext(doc);
            if (doc != null && doc != otherNode.getOwnerDocument()) {
                Node ret = doc.adoptNode(otherNode);
                // FIXME: this is really a hack, see documentation of fixUserData() for more details.
                fixUserData(prev, ret);
                if (ret == null) {
                    throw context.getRuntime().newRuntimeError("Failed to take ownership of node");
                }
                otherNode = ret;
            }

            Node parent = thisNode.getParentNode();

            switch (scheme) {
            case CHILD:
                Node[] children = adoptAsChild(context, thisNode, otherNode);
                if (children.length == 1 && otherNode == children[0]) {
                    break;
                } else {
                    nodeOrTags = nodeArrayToRubyArray(context.getRuntime(), children);
                }
                break;
            case PREV_SIBLING:
                adoptAsPrevSibling(context, parent, thisNode, otherNode);
                break;
            case NEXT_SIBLING:
                adoptAsNextSibling(context, parent, thisNode, otherNode);
                break;
            case REPLACEMENT:
                adoptAsReplacement(context, parent, thisNode, otherNode);
                break;
            }
         } catch (Exception e) {
             throw context.getRuntime().newRuntimeError(e.toString());
         }

        if (otherNode.getNodeType() == Node.TEXT_NODE) {
            coalesceTextNodes(context, other, scheme);
        }

        if (this instanceof XmlDocument) {
            ((XmlDocument) this).resetNamespaceCache(context);
        }

        other.relink_namespace(context);

        return nodeOrTags;
    }

    /**
     * This is a hack to fix #839. We should submit a patch to Xerces.
     * It looks like CoreDocumentImpl.adoptNode() doesn't copy
     * the user data associated with child nodes (recursively).
     */
    private void fixUserData(Document previous, Node ret) {
      String key = NokogiriHelpers.ENCODED_STRING;
      for (Node child = ret.getFirstChild(); child != null; child = child.getNextSibling()) {
        CoreDocumentImpl previousDocument = (CoreDocumentImpl) previous;
        child.setUserData(key, previousDocument.getUserData(child, key), null);
        fixUserData(previous, child);
      }
    }

    protected Node[] adoptAsChild(ThreadContext context, Node parent,
                                Node otherNode) {
        /*
         * This is a bit of a hack.  C-Nokogiri allows adding a bare
         * text node as the root element.  Java (and XML spec?) does
         * not.  So we wrap the text node in an element.
         */
        if (parent.getNodeType() == Node.DOCUMENT_NODE && otherNode.getNodeType() == Node.TEXT_NODE) {
          Element e = (Element) parent.getFirstChild();
          if (e == null || !e.getNodeName().equals(TEXT_WRAPPER_NAME)) {
            e = ((Document)parent).createElement(TEXT_WRAPPER_NAME);
            adoptAsChild(context, parent, e);
          }
          e.appendChild(otherNode);
          otherNode = e;
        } else {
          addNamespaceURIIfNeeded(otherNode);
          parent.appendChild(otherNode);
        }
        Node[] nodes = new Node[1];
        nodes[0] = otherNode;
        return nodes;
    }

    private void addNamespaceURIIfNeeded(Node child) {
        if (this instanceof XmlDocumentFragment && ((XmlDocumentFragment)this).getFragmentContext() != null) {
            XmlElement fragmentContext = ((XmlDocumentFragment)this).getFragmentContext();
            String namespace_uri = fragmentContext.node.getNamespaceURI();
            if (namespace_uri != null && namespace_uri.length() > 0) {
                NokogiriHelpers.renameNode(child, namespace_uri, child.getNodeName());
            }
        }
    }

    protected void adoptAsPrevSibling(ThreadContext context,
                                      Node parent,
                                      Node thisNode, Node otherNode) {
        if (parent == null) {
            /* I'm not sure what do do here...  A node with no
             * parent can't exactly have a 'sibling', so we make
             * otherNode parentless also. */
            if (otherNode.getParentNode() != null)
                otherNode.getParentNode().removeChild(otherNode);
            return;
        }

        parent.insertBefore(otherNode, thisNode);
    }

    protected void adoptAsNextSibling(ThreadContext context,
                                      Node parent,
                                      Node thisNode, Node otherNode) {
        if (parent == null) {
            /* I'm not sure what do do here...  A node with no
             * parent can't exactly have a 'sibling', so we make
             * otherNode parentless also. */
            if (otherNode.getParentNode() != null)
                otherNode.getParentNode().removeChild(otherNode);

            return;
        }

        Node nextSib = thisNode.getNextSibling();

        if (nextSib != null) {
            parent.insertBefore(otherNode, nextSib);
        } else {
            parent.appendChild(otherNode);
        }
    }

    protected void adoptAsReplacement(ThreadContext context,
                                      Node parentNode,
                                      Node thisNode, Node otherNode) {
        if (parentNode == null) {
            /* nothing to replace? */
            return;
        }

        try {
            parentNode.replaceChild(otherNode, thisNode);
        } catch (Exception e) {
            String prefix = "could not replace child: ";
            throw context.getRuntime().newRuntimeError(prefix + e.toString());
        }
    }

    /**
     * Add <code>other</code> as a child of <code>this</code>.
     */
    @JRubyMethod(visibility=Visibility.PRIVATE)
    public IRubyObject add_child_node(ThreadContext context, IRubyObject other) {
        return adoptAs(context, AdoptScheme.CHILD, other);
    }

    /**
     * Replace <code>this</code> with <code>other</code>.
     */
    @JRubyMethod(visibility=Visibility.PRIVATE)
    public IRubyObject replace_node(ThreadContext context, IRubyObject other) {
        return adoptAs(context, AdoptScheme.REPLACEMENT, other);
    }

    /**
     * Add <code>other</code> as a sibling before <code>this</code>.
     */
    @JRubyMethod(visibility=Visibility.PRIVATE)
    public IRubyObject add_previous_sibling_node(ThreadContext context, IRubyObject other) {
        return adoptAs(context, AdoptScheme.PREV_SIBLING, other);
    }

    /**
     * Add <code>other</code> as a sibling after <code>this</code>.
     */
    @JRubyMethod(visibility=Visibility.PRIVATE)
    public IRubyObject add_next_sibling_node(ThreadContext context, IRubyObject other) {
        return adoptAs(context, AdoptScheme.NEXT_SIBLING, other);
    }

    /**
     * call-seq:
     *   process_xincludes(options)
     *
     * Loads and substitutes all xinclude elements below the node. The
     * parser context will be initialized with +options+.
     *
     */
    @JRubyMethod(visibility=Visibility.PRIVATE)
    public IRubyObject process_xincludes(ThreadContext context, IRubyObject options) {
        XmlDocument xmlDocument = (XmlDocument)document(context);
        RubyArray errors = (RubyArray)xmlDocument.getInstanceVariable("@errors");
        while(errors.getLength() > 0) {
            XmlSyntaxError error = (XmlSyntaxError)errors.shift(context);
            if (error.toString().contains("Include operation failed")) {
                throw new RaiseException(error);
            }
        }
        return this;
    }

    @JRubyMethod(visibility=Visibility.PRIVATE)
    public IRubyObject clear_xpath_context(ThreadContext context) {
        clearXpathContext(getNode());
        return context.nil ;
    }
}
