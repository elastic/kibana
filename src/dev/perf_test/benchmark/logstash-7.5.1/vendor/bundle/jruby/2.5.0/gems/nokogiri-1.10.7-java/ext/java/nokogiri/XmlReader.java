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

package nokogiri;

import static nokogiri.internals.NokogiriHelpers.getNokogiriClass;
import static nokogiri.internals.NokogiriHelpers.stringOrBlank;

import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedList;
import java.util.List;
import java.util.Stack;

import nokogiri.internals.NokogiriEntityResolver;
import nokogiri.internals.ParserContext;
import nokogiri.internals.ParserContext.Options;
import nokogiri.internals.ReaderNode;
import nokogiri.internals.ReaderNode.ClosingNode;
import nokogiri.internals.ReaderNode.ElementNode;
import nokogiri.internals.ReaderNode.TextNode;
import nokogiri.internals.UncloseableInputStream;

import org.apache.xerces.impl.Constants;
import org.apache.xerces.impl.xs.opti.DefaultXMLDocumentHandler;
import org.apache.xerces.parsers.StandardParserConfiguration;
import org.apache.xerces.util.EntityResolver2Wrapper;
import org.apache.xerces.xni.Augmentations;
import org.apache.xerces.xni.NamespaceContext;
import org.apache.xerces.xni.QName;
import org.apache.xerces.xni.XMLAttributes;
import org.apache.xerces.xni.XMLLocator;
import org.apache.xerces.xni.XMLResourceIdentifier;
import org.apache.xerces.xni.XMLString;
import org.apache.xerces.xni.XNIException;
import org.apache.xerces.xni.parser.XMLErrorHandler;
import org.apache.xerces.xni.parser.XMLInputSource;
import org.apache.xerces.xni.parser.XMLParseException;
import org.apache.xerces.xni.parser.XMLPullParserConfiguration;
import org.jruby.Ruby;
import org.jruby.RubyArray;
import org.jruby.RubyBoolean;
import org.jruby.RubyClass;
import org.jruby.RubyFixnum;
import org.jruby.RubyObject;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.exceptions.RaiseException;
import org.jruby.runtime.Block;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.jruby.util.IOInputStream;
import org.xml.sax.InputSource;

/**
 * Class for Nokogiri:XML::Reader
 *
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */
@JRubyClass(name="Nokogiri::XML::Reader")
public class XmlReader extends RubyObject {

    private static final int XML_TEXTREADER_MODE_INITIAL = 0;
    private static final int XML_TEXTREADER_MODE_INTERACTIVE = 1;
    private static final int XML_TEXTREADER_MODE_ERROR = 2;
    private static final int XML_TEXTREADER_MODE_EOF = 3;
    private static final int XML_TEXTREADER_MODE_CLOSED = 4;
    private static final int XML_TEXTREADER_MODE_READING = 5;

    List<ReaderNode> nodeQueue;
    private int state;
    private int position = 0;
    private XMLPullParserConfiguration config;
    private boolean continueParsing = true;

    public XmlReader(Ruby runtime, RubyClass klazz) {
        super(runtime, klazz);
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

    public void init(Ruby runtime) {
        nodeQueue = new LinkedList<ReaderNode>();
        nodeQueue.add(new ReaderNode.EmptyNode(runtime));
    }

    private void setInput(ThreadContext context, InputStream in, IRubyObject url, Options options){
        this.setState(XML_TEXTREADER_MODE_READING);
        config = this.createReader(context.getRuntime(), options);
        InputSource inputSource = new InputSource();
        ParserContext.setUrl(context, inputSource, url);
        XMLInputSource xmlInputSource = new XMLInputSource(inputSource.getPublicId(),
            inputSource.getSystemId(), null, in, null);
        try {
          config.setInputSource(xmlInputSource);
        } catch (IOException e) {
          throw context.getRuntime().newRuntimeError(e.getMessage());
        }
        this.setState(XML_TEXTREADER_MODE_CLOSED);
    }

    private void setState(int state) { this.state = state; }

    @JRubyMethod
    public IRubyObject attribute(ThreadContext context, IRubyObject name) {
        return currentNode().getAttributeByName(name);
    }

    @JRubyMethod
    public IRubyObject attribute_at(ThreadContext context, IRubyObject index) {
        return currentNode().getAttributeByIndex(index);
    }

    @JRubyMethod
    public IRubyObject attribute_count(ThreadContext context) {
        return currentNode().getAttributeCount();
    }

    @JRubyMethod
    public IRubyObject attribute_nodes(ThreadContext context) {
        return currentNode().getAttributesNodes();
    }

    @JRubyMethod
    public IRubyObject attr_nodes(ThreadContext context) {
        return currentNode().getAttributesNodes();
    }

    @JRubyMethod(name = "attributes?")
    public IRubyObject attributes_p(ThreadContext context) {
        return currentNode().hasAttributes();
    }

    @JRubyMethod
    public IRubyObject base_uri(ThreadContext context) {
        return currentNode().getXmlBase();
    }

    @JRubyMethod(name="default?")
    public IRubyObject default_p(ThreadContext context){
        return currentNode().isDefault();
    }

    @JRubyMethod
    public IRubyObject depth(ThreadContext context) {
        return currentNode().getDepth();
    }

    @JRubyMethod(name = {"empty_element?", "self_closing?"})
    public IRubyObject empty_element_p(ThreadContext context) {
        ReaderNode readerNode = currentNode();
        ensureNodeClosed(context);

        if (readerNode == null) return context.getRuntime().getNil();
        if (!(readerNode instanceof ElementNode)) context.getRuntime().getFalse();
        return RubyBoolean.newBoolean(context.getRuntime(), !readerNode.hasChildren);
    }

    @JRubyMethod(meta = true, rest = true)
    public static IRubyObject from_io(ThreadContext context, IRubyObject cls, IRubyObject args[]) {
        // Only to pass the  source test.
        Ruby runtime = context.getRuntime();
        // Not nil allowed!
        if(args[0].isNil()) throw runtime.newArgumentError("io cannot be nil");

        XmlReader reader = (XmlReader) NokogiriService.XML_READER_ALLOCATOR.allocate(runtime, getNokogiriClass(runtime, "Nokogiri::XML::Reader"));
        reader.init(runtime);
        reader.setInstanceVariable("@source", args[0]);
        reader.setInstanceVariable("@errors", runtime.newArray());
        IRubyObject url = context.nil;
        if (args.length > 1) url = args[1];
        if (args.length > 2) reader.setInstanceVariable("@encoding", args[2]);

        Options options;
        if (args.length > 3) {
          options = new ParserContext.Options((Long)args[3].toJava(Long.class));
        } else {
          // use the default options RECOVER | NONET
          options = new ParserContext.Options(2048 | 1);
        }

        InputStream in = new UncloseableInputStream(new IOInputStream(args[0]));
        reader.setInput(context, in, url, options);
        return reader;
    }

    @JRubyMethod(meta = true, rest = true)
    public static IRubyObject from_memory(ThreadContext context, IRubyObject cls, IRubyObject args[]) {
        // args[0]: string, args[1]: url, args[2]: encoding, args[3]: options
        Ruby runtime = context.getRuntime();
        // Not nil allowed!
        if(args[0].isNil()) throw runtime.newArgumentError("string cannot be nil");

        XmlReader reader = (XmlReader) NokogiriService.XML_READER_ALLOCATOR.allocate(runtime, getNokogiriClass(runtime, "Nokogiri::XML::Reader"));
        reader.init(runtime);
        reader.setInstanceVariable("@source", args[0]);
        reader.setInstanceVariable("@errors", runtime.newArray());
        IRubyObject url = context.nil;
        if (args.length > 1) url = args[1];
        if (args.length > 2) reader.setInstanceVariable("@encoding", args[2]);

        Options options;
        if (args.length > 3) {
          options = new ParserContext.Options((Long)args[3].toJava(Long.class));
        } else {
          // use the default options RECOVER | NONET
          options = new ParserContext.Options(2048 | 1);
        }
        IRubyObject stringIO = runtime.getClass("StringIO").newInstance(context, args[0], Block.NULL_BLOCK);
        InputStream in = new UncloseableInputStream(new IOInputStream(stringIO));
        reader.setInput(context, in, url, options);
        return reader;
    }

    @JRubyMethod
    public IRubyObject node_type(ThreadContext context) {
        IRubyObject node_type = currentNode().getNodeType();
        return node_type == null ? RubyFixnum.zero(context.getRuntime()) : node_type;
    }

    @JRubyMethod
    public IRubyObject inner_xml(ThreadContext context) {
        ensureNodeClosed(context);
        return stringOrBlank(context.getRuntime(), getInnerXml(currentNode()));
    }

    private String getInnerXml(ReaderNode current) {
        if (current.depth < 0) return null;
        if (!current.hasChildren) return null;
        StringBuffer sb = new StringBuffer();
        for (int i = current.startOffset + 1; i <= current.endOffset - 1; i++) {
          sb.append(nodeQueue.get(i).getString());
        }
        return new String(sb);
    }

    @JRubyMethod
    public IRubyObject outer_xml(ThreadContext context) {
        ensureNodeClosed(context);
        return stringOrBlank(context.getRuntime(), getOuterXml());
    }

    private String getOuterXml() {
        ReaderNode current = currentNode();
        if (current == null || current.depth < 0) return null;

        if (current instanceof ClosingNode) {
            return "<" + current.name + "/>";
        }

        StringBuilder sb = new StringBuilder();
        for (int i = position; i <= current.endOffset; i++) {
            sb.append(nodeQueue.get(i).getString());
        }
        return new String(sb);
    }

    @JRubyMethod
    public IRubyObject lang(ThreadContext context) {
        return currentNode().getLang();
    }

    @JRubyMethod
    public IRubyObject local_name(ThreadContext context) {
        return currentNode().getLocalName();
    }

    @JRubyMethod
    public IRubyObject name(ThreadContext context) {
        return currentNode().getName();
    }

    @JRubyMethod
    public IRubyObject namespace_uri(ThreadContext context) {
        return currentNode().getUri();
    }

    @JRubyMethod
    public IRubyObject namespaces(ThreadContext context) {
        return currentNode().getNamespaces(context);
    }

    @JRubyMethod
    public IRubyObject prefix(ThreadContext context) {
        return currentNode().getPrefix();
    }

    private void readMoreData(ThreadContext context) {
        if (!continueParsing) throw context.runtime.newRuntimeError("Cannot parse more data");
        try {
            continueParsing = config.parse(false);
        }
        catch (XNIException e) {
            throw new RaiseException(XmlSyntaxError.createXMLSyntaxError(context.runtime, e)); // Nokogiri::XML::SyntaxError
        }
        catch (IOException e) {
            throw context.runtime.newRuntimeError(e.toString());
        }
    }

    private void ensureNodeClosed(ThreadContext context) {
        ReaderNode node = currentNode();
        if (node instanceof TextNode) return;
        while (node.endOffset < 1) readMoreData(context);
    }

    @JRubyMethod
    public IRubyObject read(ThreadContext context) {
        position++;
        try {
            while (nodeQueue.size() <= position && continueParsing) {
                readMoreData(context);
            }
            return setAndRaiseErrorsIfAny(context.runtime, null);
        }
        catch (RaiseException ex) {
            return setAndRaiseErrorsIfAny(context.runtime, ex);
        }
    }

    private IRubyObject setAndRaiseErrorsIfAny(final Ruby runtime, final RaiseException ex) throws RaiseException {
        final ReaderNode currentNode = currentNode();
        if (currentNode == null) return runtime.getNil();
        if (currentNode.isError()) {
            RubyArray errors = (RubyArray) getInstanceVariable("@errors");
            IRubyObject error = currentNode.toSyntaxError();
            errors.append(error);
            setInstanceVariable("@errors", errors);

            throw ex != null ? ex : new RaiseException((XmlSyntaxError) error);
        }
        if ( ex != null ) throw ex;
        return this;
    }

    private ReaderNode currentNode() {
        if (position >= nodeQueue.size()) return null;
        return nodeQueue.get(position);
    }

    @JRubyMethod
    public IRubyObject state(ThreadContext context) {
        return context.getRuntime().newFixnum(this.state);
    }

    @JRubyMethod
    public IRubyObject value(ThreadContext context) {
        return currentNode().getValue();
    }

    @JRubyMethod(name = "value?")
    public IRubyObject value_p(ThreadContext context) {
        return currentNode().hasValue();
    }

    @JRubyMethod
    public IRubyObject xml_version(ThreadContext context) {
        return currentNode().getXmlVersion();
    }

    protected XMLPullParserConfiguration createReader(Ruby ruby, Options options) {
        StandardParserConfiguration config = new StandardParserConfiguration();
        DocumentHandler handler = new DocumentHandler(ruby);
        // XMLReader reader = XMLReaderFactory.createXMLReader();
        config.setDocumentHandler(handler);
        config.setDTDHandler(handler);
        config.setErrorHandler(handler);
        config.setEntityResolver(new EntityResolver2Wrapper(new NokogiriEntityResolver(ruby, null, options)));
        // config.setFeature("http://xml.org/sax/features/xmlns-uris", true);
        // config.setFeature("http://xml.org/sax/features/namespace-prefixes", true);
        config.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", options.dtdLoad || options.dtdValid);
        return config;
    }

    private class DocumentHandler extends DefaultXMLDocumentHandler implements XMLErrorHandler {

        Stack<String> langStack;
        int depth;
        Stack<String> xmlBaseStack;
        Stack<ReaderNode.ElementNode> elementStack;
        private final Ruby ruby;

        public DocumentHandler(Ruby ruby) {
          this.ruby = ruby;
        }

        @Override
        public void startGeneralEntity(String name, XMLResourceIdentifier identifier,
                                       String encoding, Augmentations augs) throws XNIException {
            Object entitySkipped;
            if (augs != null && (entitySkipped = augs.getItem(Constants.ENTITY_SKIPPED)) != null && ((Boolean) entitySkipped)) {
                nodeQueue.add(new ReaderNode.ExceptionNode(ruby, null));
            }
        }



        @Override
        public void startDocument(XMLLocator locator, String encoding, NamespaceContext context, Augmentations augs) {
            depth = 0;
            langStack = new Stack<String>();
            xmlBaseStack = new Stack<String>();
            elementStack = new Stack<ReaderNode.ElementNode>();
        }

        @Override
        public void endDocument(Augmentations augs) {
            langStack = null;
            xmlBaseStack = null;
            elementStack = null;
        }

        @Override
        public void startElement(QName element, XMLAttributes attrs, Augmentations augs) {
          commonElement(element, attrs, false);
        }

        @Override
        public void endElement(QName element, Augmentations augs) {
            String uri = element.uri;
            String localName = element.localpart;
            String qName = element.rawname;
            depth--;
            ElementNode startElementNode = elementStack.pop();
            ReaderNode node = ReaderNode.createClosingNode(ruby, uri, localName, qName, depth, langStack, xmlBaseStack);

            startElementNode.endOffset = nodeQueue.size() - 1;

            if (startElementNode.endOffset != startElementNode.startOffset) {
              // this node isn't empty
              node.attributeList = startElementNode.attributeList;
              node.namespaces = startElementNode.namespaces;
              node.startOffset = startElementNode.startOffset;
              node.endOffset = ++startElementNode.endOffset;
              node.hasChildren = startElementNode.hasChildren = true;
              nodeQueue.add(node);
            }
            if (!langStack.isEmpty()) langStack.pop();
            if (!xmlBaseStack.isEmpty()) xmlBaseStack.pop();
        }

        @Override
        public void emptyElement(QName element, XMLAttributes attrs, Augmentations augs) {
            commonElement(element, attrs, true);
        }

        private void commonElement(QName element, XMLAttributes attrs, boolean isEmpty) {
            String qName = element.rawname;
            String uri = element.uri;
            String localName = element.localpart;
            ReaderNode readerNode = ReaderNode.createElementNode(ruby, uri, localName, qName, attrs, depth, langStack, xmlBaseStack);
            if (!elementStack.isEmpty()) {
              ElementNode parent = elementStack.peek();
              parent.hasChildren = true;
            }
            nodeQueue.add(readerNode);
            readerNode.startOffset = nodeQueue.size() - 1;
            if (!isEmpty) {
              depth++;
              if (readerNode.lang != null) langStack.push(readerNode.lang);
              if (readerNode.xmlBase != null) xmlBaseStack.push(readerNode.xmlBase);
              elementStack.push((ReaderNode.ElementNode)readerNode);
            } else {
              readerNode.endOffset = readerNode.startOffset;
              readerNode.hasChildren = false;
            }
        }

        @Override
        public void characters(XMLString string, Augmentations augs) {
            ReaderNode.TextNode node = ReaderNode.createTextNode(ruby, string.toString(), depth, langStack, xmlBaseStack);
            nodeQueue.add(node);
            node.startOffset = node.endOffset = nodeQueue.size() - 1;
        }

        @Override
        public void error(String domain, String key, XMLParseException ex) {
            nodeQueue.add(new ReaderNode.ExceptionNode(ruby, ex));
            throw ex;
        }

        @Override
        public void fatalError(String domain, String key, XMLParseException ex) {
            nodeQueue.add(new ReaderNode.ExceptionNode(ruby, ex));
            throw ex;
        }

        @Override
        public void warning(String domain, String key, XMLParseException ex) {
            nodeQueue.add(new ReaderNode.ExceptionNode(ruby, ex));
            throw ex;
        }
    }
}
