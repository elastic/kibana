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

package nokogiri.internals;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Stack;

import nokogiri.NokogiriService;
import nokogiri.XmlAttr;
import nokogiri.XmlDocument;
import nokogiri.XmlSyntaxError;

import org.apache.xerces.xni.XMLAttributes;
import org.jruby.Ruby;
import org.jruby.RubyArray;
import org.jruby.RubyBoolean;
import org.jruby.RubyHash;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Attr;
import org.w3c.dom.Document;

import static nokogiri.internals.NokogiriHelpers.*;

/**
 * Abstract class of Node for XmlReader.
 *
 * @author Yoko Harada <yokolet@gmail.com>
 *
 */
public abstract class ReaderNode {

    final Ruby ruby;
    public ReaderAttributeList attributeList;
    public Map<String, String> namespaces;
    public int depth, nodeType;
    public String lang, localName, xmlBase, prefix, name, uri, value, xmlVersion = "1.0";
    public int startOffset, endOffset;
    public boolean hasChildren = false;
    private Document document = null;

    protected ReaderNode(final Ruby runtime) {
        this.ruby = runtime;
    }

    public abstract String getString();

    public IRubyObject getAttributeByIndex(IRubyObject index){
        if(index.isNil()) return index;

        long i = index.convertToInteger().getLongValue();
        if(i > Integer.MAX_VALUE) {
            throw ruby.newArgumentError("value too long to be an array index");
        }

        if (attributeList == null) return ruby.getNil();
        if (i<0 || attributeList.length <= i) return ruby.getNil();
        return stringOrBlank(ruby, attributeList.values.get(((Long)i).intValue()));
    }

    public IRubyObject getAttributeByName(IRubyObject name){
        if(attributeList == null) return ruby.getNil();
        String value = attributeList.getByName(rubyStringToString(name));
        return stringOrNil(ruby, value);
    }

    public IRubyObject getAttributeByName(String name){
        if(attributeList == null) return ruby.getNil();
        String value = attributeList.getByName(name);
        return stringOrNil(ruby, value);
    }

    public IRubyObject getAttributeCount(){
        if(attributeList == null) return ruby.newFixnum(0);
        return ruby.newFixnum(attributeList.length);
    }

    public IRubyObject getAttributesNodes() {
        RubyArray array = RubyArray.newArray(ruby);
        if (attributeList != null && attributeList.length > 0) {
            if (document == null) {
                XmlDocument doc = (XmlDocument) XmlDocument.rbNew(ruby.getCurrentContext(), getNokogiriClass(ruby, "Nokogiri::XML::Document"), new IRubyObject[0]);
                document = doc.getDocument();
            }
            for (int i=0; i<attributeList.length; i++) {
                if (!isNamespace(attributeList.names.get(i))) {
                    Attr attr = document.createAttributeNS(attributeList.namespaces.get(i), attributeList.names.get(i));
                    attr.setValue(attributeList.values.get(i));
                    XmlAttr xmlAttr = (XmlAttr) NokogiriService.XML_ATTR_ALLOCATOR.allocate(ruby, getNokogiriClass(ruby, "Nokogiri::XML::Attr"));
                    xmlAttr.setNode(ruby.getCurrentContext(), attr);
                    array.append(xmlAttr);
                }
            }
        }
        return array;
    }

    public IRubyObject getAttributes(ThreadContext context) {
        final Ruby runtime = context.runtime;
        if (attributeList == null) return runtime.getNil();
        RubyHash hash = RubyHash.newHash(runtime);
        for (int i=0; i<attributeList.length; i++) {
            IRubyObject k = stringOrBlank(runtime, attributeList.names.get(i));
            IRubyObject v = stringOrBlank(runtime, attributeList.values.get(i));
            hash.fastASetCheckString(runtime, k, v); // hash.op_aset(context, k, v)
        }
        return hash;
    }

    public IRubyObject getDepth() {
        return ruby.newFixnum(depth);
    }

    public IRubyObject getLang() {
        return stringOrNil(ruby, lang);
    }

    public IRubyObject getLocalName() {
        return stringOrNil(ruby, localName);
    }

    public IRubyObject getName() {
        return stringOrNil(ruby, name);
    }

    public IRubyObject getNamespaces(ThreadContext context) {
        final Ruby runtime = context.runtime;
        if (namespaces == null) return runtime.getNil();
        RubyHash hash = RubyHash.newHash(runtime);
        for (Map.Entry<String, String> entry : namespaces.entrySet()) {
            IRubyObject k = stringOrBlank(runtime, entry.getKey());
            IRubyObject v = stringOrBlank(runtime, entry.getValue());
            hash.fastASetCheckString(runtime, k, v); // hash.op_aset(context, k, v)
        }
        return hash;
    }

    public IRubyObject getXmlBase() {
        return stringOrNil(ruby, xmlBase);
    }

    public IRubyObject getPrefix() {
        return stringOrNil(ruby, prefix);
    }

    public IRubyObject getUri() {
        return stringOrNil(ruby, uri);
    }

    public IRubyObject getValue() {
        return stringOrNil(ruby, value);
    }

    public IRubyObject getXmlVersion() {
        return ruby.newString(xmlVersion);
    }

    public RubyBoolean hasAttributes() {
        if (attributeList == null || attributeList.length == 0) return ruby.getFalse();
        return ruby.getTrue();
    }

    public abstract RubyBoolean hasValue();

    public RubyBoolean isDefault(){
        // TODO Implement.
        return ruby.getFalse();
    }

    public boolean isError() { return false; }

    protected void parsePrefix(String qName) {
        int index = qName.indexOf(':');
        if(index != -1) prefix = qName.substring(0, index);
    }

    public void setLang(String lang) {
        this.lang = lang;
    }

    public IRubyObject toSyntaxError() { return ruby.getNil(); }

    public IRubyObject getNodeType() { return ruby.newFixnum(nodeType); }

    public static enum ReaderNodeType {
        NODE(0),
        ELEMENT(1),
        ATTRIBUTE(2),
        TEXT(3),
        CDATA(4),
        ENTITY_REFERENCE(5),
        ENTITY(6),
        PROCESSING_INSTRUCTION(7),
        COMMENT(8),
        DOCUMENT(9),
        DOCUMENT_TYPE(10),
        DOCUMENTFRAGMENT(11),
        NOTATION(12),
        WHITESPACE(13),
        SIGNIFICANT_WHITESPACE(14),
        END_ELEMENT(15),
        END_ENTITY(16),
        XML_DECLARATION(17);

        private final int value;
        ReaderNodeType(int value) {
            this.value = value;
        }

        public int getValue() {
            return value;
        }
    }

    public static ClosingNode createClosingNode(Ruby ruby, String uri, String localName, String qName, int depth, Stack<String> langStack, Stack<String> xmlBaseStack) {
        return new ClosingNode(ruby, uri, localName, qName, depth, langStack, xmlBaseStack);
    }

    public static class ClosingNode extends ReaderNode {

        // public ClosingNode() {}

        ClosingNode(Ruby runtime, String uri, String localName, String qName, int depth, Stack<String> langStack, Stack<String> xmlBaseStack) {
            super(runtime);
            nodeType = ReaderNodeType.END_ELEMENT.getValue();
            this.uri = "".equals(uri) ? null : uri;
            this.localName = ! isBlank(localName) ? localName : qName;
            this.name = qName;
            parsePrefix(qName);
            this.depth = depth;
            if (!langStack.isEmpty()) this.lang = langStack.peek();
            if (!xmlBaseStack.isEmpty()) this.xmlBase = xmlBaseStack.peek();
        }

        @Override
        public IRubyObject getAttributeCount() {
            return ruby.newFixnum(0);
        }

        @Override
        public RubyBoolean hasValue() {
            return ruby.getFalse();
        }

        @Override
        public String getString() {
            return "</" + name + '>';
        }
    }

    public static ElementNode createElementNode(Ruby ruby, String uri, String localName, String qName, XMLAttributes attrs, int depth, Stack<String> langStack, Stack<String> xmlBaseStack) {
        return new ElementNode(ruby, uri, localName, qName, attrs, depth, langStack, xmlBaseStack);
    }

    public static class ElementNode extends ReaderNode {

        // public ElementNode() {}

        ElementNode(Ruby runtime, String uri, String localName, String qName, XMLAttributes attrs, int depth, Stack<String> langStack, Stack<String> xmlBaseStack) {
            super(runtime);
            this.nodeType = ReaderNodeType.ELEMENT.getValue();
            this.uri = "".equals(uri) ? null : uri;
            this.localName = ! isBlank(localName) ? localName : qName;
            this.name = qName;
            parsePrefix(qName);
            this.depth = depth;
            parseAttributes(attrs, langStack, xmlBaseStack);
        }

        @Override
        public RubyBoolean hasValue() {
            return ruby.getFalse();
        }

        private void parseAttributes(XMLAttributes attrs, Stack<String> langStack, Stack<String> xmlBaseStack) {
            if (attrs.getLength() > 0) attributeList = new ReaderAttributeList();
            String u, n, v;
            for (int i = 0; i < attrs.getLength(); i++) {
                u = attrs.getURI(i);
                n = attrs.getQName(i);
                v = attrs.getValue(i);
                if (isNamespace(n)) {
                    if (namespaces == null) namespaces = new HashMap<String, String>();
                    namespaces.put(n, v);
                } else {
                    if (lang == null) lang = resolveLang(n, v, langStack);
                    if (xmlBase == null) xmlBase = resolveXmlBase(n, v, xmlBaseStack);
                }
                attributeList.add(u, n, v);
            }
        }

        private String resolveLang(String n, String v, Stack<String> langStack) {
            if ("xml:lang".equals(n)) {
                return v;
            } else if (!langStack.isEmpty()) {
                return langStack.peek();
            } else {
                return null;
            }
        }

        private String resolveXmlBase(String n, String v, Stack<String> xmlBaseStack) {
            if (isXmlBase(n)) {
                return getXmlBaseUri(n, v, xmlBaseStack);
            } else if (!xmlBaseStack.isEmpty()) {
                return xmlBaseStack.peek();
            } else {
                return null;
            }
        }

        private String getXmlBaseUri(String n, String v, Stack<String> xmlBaseStack) {
            if ("xml:base".equals(n)) {
                if (v.startsWith("http://")) {
                    return v;
                } else if (v.startsWith("/") && v.endsWith("/")) {
                    String sub = v.substring(1, v.length() - 2);
                    String base = xmlBaseStack.peek();
                    if (base.endsWith("/")) {
                        base = base.substring(0, base.length() - 1);
                    }
                    int pos = base.lastIndexOf("/");
                    return base.substring(0, pos).concat(sub);
                } else {
                    String base = xmlBaseStack.peek();
                    if (base.endsWith("/")) return base.concat(v);
                    else return base.concat("/").concat(v);
                }
            } else if ("xlink:href".equals(n)) {
							if (v.startsWith("http://")) {
								return v;
							} else if (!xmlBaseStack.isEmpty()) {
                String base = xmlBaseStack.peek();
								return base;
							}
            }
            return null;
        }

        @Override
        public String getString() {
            StringBuffer sb = new StringBuffer(24);
            sb.append('<').append(name);
            if (attributeList != null) {
                for (int i=0; i<attributeList.length; i++) {
                    String n = attributeList.names.get(i);
                    String v = attributeList.values.get(i);
                    sb.append(' ').append(n).append('=')
                      .append('"').append(v).append('"');
                }
            }
            if (hasChildren) sb.append('>');
            else sb.append("/>");
            return sb.toString();
        }
    }

    private static class ReaderAttributeList {
        final List<String> namespaces  = new ArrayList<String>();
        final List<String> names  = new ArrayList<String>();
        final List<String> values = new ArrayList<String>();
        int length = 0;

        void add(String namespace, String name, String value) {
            namespaces.add(namespace != null ? namespace : "");
            names.add(name != null ? name : "");
            values.add(value != null ? value : "");
            length++;
        }

        String getByName(String name) {
            for (int i=0; i<names.size(); i++) {
                if (name.equals(names.get(i))) {
                    return values.get(i);
                }
            }
            return null;
        }
    }

    public static class EmptyNode extends ReaderNode {

        public EmptyNode(Ruby runtime) {
            super(runtime);
            this.nodeType = ReaderNodeType.NODE.getValue();
        }

        @Override
        public IRubyObject getXmlVersion() {
            return this.ruby.getNil();
        }

        @Override
        public RubyBoolean hasValue() {
            return ruby.getFalse();
        }

        @Override
        public String getString() {
            return null;
        }
    }

    public static class ExceptionNode extends EmptyNode {
        private final XmlSyntaxError exception;

        public ExceptionNode(Ruby runtime, Exception ex) {
            super(runtime);
            exception = XmlSyntaxError.createXMLSyntaxError(runtime); // Nokogiri::XML::SyntaxError
            exception.setException(ex);
        }

        @Override
        public boolean isError() {
            return true;
        }

        @Override
        public IRubyObject toSyntaxError() {
            return this.exception;
        }
    }

    public static TextNode createTextNode(Ruby ruby, String content, int depth, Stack<String> langStack, Stack<String> xmlBaseStack) {
        return new TextNode(ruby, content, depth, langStack, xmlBaseStack);
    }

    public static class TextNode extends ReaderNode {

        // public TextNode() {}

        TextNode(Ruby runtime, String content, int depth, Stack<String> langStack, Stack<String> xmlBaseStack) {
            super(runtime);
            this.value = content;
            this.localName = "#text";
            this.name = "#text";
            this.depth = depth;
            if (!isBlank(content)) nodeType = ReaderNodeType.TEXT.getValue();
            else nodeType = ReaderNodeType.SIGNIFICANT_WHITESPACE.getValue();
            if (!langStack.isEmpty()) this.lang = langStack.peek();
            if (!xmlBaseStack.isEmpty()) this.xmlBase = xmlBaseStack.peek();
        }

        @Override
        public RubyBoolean hasValue() {
            return ruby.getTrue();
        }

        @Override
        public String getString() {
            return value;
        }
    }

}
