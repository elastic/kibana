/**
 * (The MIT License)
 *
 * Copyright (c) 2008 - 2012:
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

package nokogiri.internals;

import static nokogiri.internals.NokogiriHelpers.getNokogiriClass;
import static nokogiri.internals.NokogiriHelpers.isBlank;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import nokogiri.NokogiriService;
import nokogiri.XmlDocument;
import nokogiri.XmlDtd;
import nokogiri.XmlSyntaxError;

import org.apache.xerces.parsers.DOMParser;
import org.jruby.Ruby;
import org.jruby.RubyArray;
import org.jruby.RubyClass;
import org.jruby.RubyFixnum;
import org.jruby.exceptions.RaiseException;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

/**
 * Parser class for XML DOM processing. This class actually parses XML document
 * and creates DOM tree in Java side. However, DOM tree in Ruby side is not since
 * we delay creating objects for performance.
 *  
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */
public class XmlDomParserContext extends ParserContext {

    protected static final String FEATURE_LOAD_EXTERNAL_DTD =
        "http://apache.org/xml/features/nonvalidating/load-external-dtd";
    protected static final String FEATURE_LOAD_DTD_GRAMMAR =
        "http://apache.org/xml/features/nonvalidating/load-dtd-grammar";
    protected static final String FEATURE_INCLUDE_IGNORABLE_WHITESPACE =
        "http://apache.org/xml/features/dom/include-ignorable-whitespace";
    protected static final String CONTINUE_AFTER_FATAL_ERROR =
        "http://apache.org/xml/features/continue-after-fatal-error";
    protected static final String FEATURE_NOT_EXPAND_ENTITY =
        "http://apache.org/xml/features/dom/create-entity-ref-nodes";
    protected static final String FEATURE_VALIDATION = "http://xml.org/sax/features/validation";
    private static final String XINCLUDE_FEATURE_ID = "http://apache.org/xml/features/xinclude";
    private static final String SECURITY_MANAGER = "http://apache.org/xml/properties/security-manager";

    protected ParserContext.Options options;
    protected DOMParser parser;
    protected NokogiriErrorHandler errorHandler;
    protected String java_encoding;
    protected IRubyObject ruby_encoding;

    public XmlDomParserContext(Ruby runtime, IRubyObject options) {
        this(runtime, runtime.getNil(), options);
    }
    
    public XmlDomParserContext(Ruby runtime, IRubyObject encoding, IRubyObject options) {
        super(runtime);
        this.options = new ParserContext.Options(RubyFixnum.fix2long(options));
        java_encoding = NokogiriHelpers.getValidEncoding(runtime, encoding);
        ruby_encoding = encoding;
        initErrorHandler();
        initParser(runtime);
    }

    protected void initErrorHandler() {
        if (options.recover) {
            errorHandler = new NokogiriNonStrictErrorHandler(options.noError, options.noWarning);
        } else {
            errorHandler = new NokogiriStrictErrorHandler(options.noError, options.noWarning);
        }
    }

    protected void initParser(Ruby runtime) {
        if (options.xInclude) {
            System.setProperty("org.apache.xerces.xni.parser.XMLParserConfiguration",
                    "org.apache.xerces.parsers.XIncludeParserConfiguration");
        }

        parser = new NokogiriDomParser(options);
        parser.setErrorHandler(errorHandler);

        // Fix for Issue#586.  This limits entity expansion up to 100000 and nodes up to 3000.
        setProperty(SECURITY_MANAGER, new org.apache.xerces.util.SecurityManager());

        if (options.noBlanks) {
            setFeature(FEATURE_INCLUDE_IGNORABLE_WHITESPACE, false);
        }

        if (options.recover) {
            setFeature(CONTINUE_AFTER_FATAL_ERROR, true);
        }

        if (options.dtdValid) {
            setFeature(FEATURE_VALIDATION, true);
        }

        if (!options.noEnt) {
          setFeature(FEATURE_NOT_EXPAND_ENTITY, true);
      }
        // If we turn off loading of external DTDs complete, we don't
        // getthe publicID.  Instead of turning off completely, we use
        // an entity resolver that returns empty documents.
        if (options.dtdLoad) {
            setFeature(FEATURE_LOAD_EXTERNAL_DTD, true);
            setFeature(FEATURE_LOAD_DTD_GRAMMAR, true);
        }
        parser.setEntityResolver(new NokogiriEntityResolver(runtime, errorHandler, options));
    }

    /**
     * Convenience method that catches and ignores SAXException
     * (unrecognized and unsupported exceptions).
     */
    protected void setFeature(String feature, boolean value) {
        try {
            parser.setFeature(feature, value);
        } catch (SAXException e) {
            // ignore
        }
    }

    /**
     * Convenience method that catches and ignores SAXException
     * (unrecognized and unsupported exceptions).
     */
    protected void setProperty(String property, Object value) {
        try {
            parser.setProperty(property, value);
        } catch (SAXException e) {
            // ignore
        }
    }

    public void addErrorsIfNecessary(ThreadContext context, XmlDocument doc) {
        doc.setInstanceVariable("@errors", mapErrors(context, errorHandler));
    }


    public static RubyArray mapErrors(ThreadContext context, NokogiriErrorHandler errorHandler) {
        final Ruby runtime = context.runtime;
        final List<Exception> errors = errorHandler.getErrors();
        final IRubyObject[] errorsAry = new IRubyObject[errors.size()];
        for (int i = 0; i < errors.size(); i++) {
            XmlSyntaxError xmlSyntaxError = XmlSyntaxError.createXMLSyntaxError(runtime);
            xmlSyntaxError.setException(errors.get(i));
            errorsAry[i] = xmlSyntaxError;
        }
        return runtime.newArrayNoCopy(errorsAry);
    }

    public XmlDocument getDocumentWithErrorsOrRaiseException(ThreadContext context, RubyClass klazz, Exception ex) {
        if (options.recover) {
            XmlDocument xmlDocument = getInterruptedOrNewXmlDocument(context, klazz);
            this.addErrorsIfNecessary(context, xmlDocument);
            XmlSyntaxError xmlSyntaxError = XmlSyntaxError.createXMLSyntaxError(context.runtime);
            xmlSyntaxError.setException(ex);
            ((RubyArray) xmlDocument.getInstanceVariable("@errors")).append(xmlSyntaxError);
            return xmlDocument;
        } else {
            XmlSyntaxError xmlSyntaxError = XmlSyntaxError.createXMLSyntaxError(context.runtime);
            xmlSyntaxError.setException(ex);
            throw new RaiseException(xmlSyntaxError);
        }
    }
    
    private XmlDocument getInterruptedOrNewXmlDocument(ThreadContext context, RubyClass klazz) {
        Document document = parser.getDocument();
        XmlDocument xmlDocument = (XmlDocument) NokogiriService.XML_DOCUMENT_ALLOCATOR.allocate(context.getRuntime(), klazz);
        if (document != null) {
            xmlDocument.setDocumentNode(context, document);
        }
        xmlDocument.setEncoding(ruby_encoding);
        return xmlDocument;
    }

    protected XmlDocument getNewEmptyDocument(ThreadContext context) {
        IRubyObject[] args = new IRubyObject[0];
        return (XmlDocument) XmlDocument.rbNew(context, getNokogiriClass(context.getRuntime(), "Nokogiri::XML::Document"), args);
    }

    /**
     * This method is broken out so that HtmlDomParserContext can
     * override it.
     */
    protected XmlDocument wrapDocument(ThreadContext context,
                                       RubyClass klazz,
                                       Document doc) {
        XmlDocument xmlDocument = (XmlDocument) NokogiriService.XML_DOCUMENT_ALLOCATOR.allocate(context.getRuntime(), klazz);
        xmlDocument.setDocumentNode(context, doc);
        xmlDocument.setEncoding(ruby_encoding);

        if (options.dtdLoad) {
            IRubyObject xmlDtdOrNil = XmlDtd.newFromExternalSubset(context.getRuntime(), doc);
            if (!xmlDtdOrNil.isNil()) {
                XmlDtd xmlDtd = (XmlDtd) xmlDtdOrNil;
                doc.setUserData(XmlDocument.DTD_EXTERNAL_SUBSET, xmlDtd, null);
            }
        }
        return xmlDocument;
    }

    /**
     * Must call setInputSource() before this method.
     */
    public XmlDocument parse(ThreadContext context,
                             IRubyObject klazz,
                             IRubyObject url) {
        XmlDocument xmlDoc;
        try {
            Document doc = do_parse();
            xmlDoc = wrapDocument(context, (RubyClass)klazz, doc);
            xmlDoc.setUrl(url);
            addErrorsIfNecessary(context, xmlDoc);
            return xmlDoc;
        } catch (SAXException e) {
            return getDocumentWithErrorsOrRaiseException(context, (RubyClass)klazz, e);
        } catch (IOException e) {
            return getDocumentWithErrorsOrRaiseException(context, (RubyClass)klazz, e);
        }
    }

    protected Document do_parse() throws SAXException, IOException {
        try {
          parser.parse(getInputSource());
        } catch (NullPointerException ex) {
          // FIXME: this is really a hack to fix #838. Xerces will throw a NullPointerException
          // if we tried to parse '<? ?>'. We should submit a patch to Xerces.
        }
        if (options.noBlanks) {
            List<Node> emptyNodes = new ArrayList<Node>();
            findEmptyTexts(parser.getDocument(), emptyNodes);
            if (emptyNodes.size() > 0) {
                for (Node node : emptyNodes) {
                    node.getParentNode().removeChild(node);
                }
            }
        }
        return parser.getDocument();
    }
    
    private static void findEmptyTexts(Node node, List<Node> emptyNodes) {
        if (node.getNodeType() == Node.TEXT_NODE && isBlank(node.getTextContent())) {
            emptyNodes.add(node);
        } else {
            NodeList children = node.getChildNodes();
            for (int i=0; i < children.getLength(); i++) {
                findEmptyTexts(children.item(i), emptyNodes);
            }
        }
    }
}
