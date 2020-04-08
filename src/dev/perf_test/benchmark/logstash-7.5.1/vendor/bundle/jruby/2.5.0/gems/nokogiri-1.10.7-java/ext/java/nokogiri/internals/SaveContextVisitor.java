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

import static nokogiri.internals.NokogiriHelpers.canonicalizeWhitespace;
import static nokogiri.internals.NokogiriHelpers.encodeJavaString;
import static nokogiri.internals.NokogiriHelpers.isNamespace;
import static nokogiri.internals.NokogiriHelpers.isBlank;
import static nokogiri.internals.NokogiriHelpers.shouldEncode;

import java.nio.charset.Charset;
import java.nio.charset.CharsetEncoder;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.cyberneko.html.HTMLElements;
import org.w3c.dom.Attr;
import org.w3c.dom.CDATASection;
import org.w3c.dom.Comment;
import org.w3c.dom.Document;
import org.w3c.dom.DocumentType;
import org.w3c.dom.Element;
import org.w3c.dom.Entity;
import org.w3c.dom.EntityReference;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.Notation;
import org.w3c.dom.ProcessingInstruction;
import org.w3c.dom.Text;

/**
 * A class for serializing a document.
 *
 * @author sergio
 * @author Patrick Mahoney <pat@polycrystal.org>
 * @author Yoko Harada <yokolet@gmail.com>
 */
public class SaveContextVisitor {

    private final StringBuilder buffer;
    private final Stack<String> indentation;
    private String encoding;
    private final CharSequence indentString;
    private boolean format;
    private final boolean noDecl;
    private final boolean noEmpty;
    private final boolean noXhtml;
    private final boolean asXhtml;
    private boolean asXml;
    private final boolean asHtml;
    private final boolean asBuilder;
    private boolean htmlDoc;
    private final boolean fragment;
    private final boolean canonical, incl_ns, with_comments;
    private boolean subsets;
    private boolean exclusive;
    private final List<Node> c14nNodeList;
    private final Deque<Attr[]> c14nNamespaceStack;
    private final Deque<Attr[]> c14nAttrStack;
    //private List<String> c14nExclusiveInclusivePrefixes = null;

    /*
     * U can't touch this.
     * http://www.youtube.com/watch?v=WJ2ZFVx6A4Q
     *
     * Taken from libxml save options.
     */

    public static final int FORMAT = 1;
    public static final int NO_DECL = 2;
    public static final int NO_EMPTY = 4;
    public static final int NO_XHTML = 8;
    public static final int AS_XHTML = 16;
    public static final int AS_XML = 32;
    public static final int AS_HTML = 64;
    public static final int AS_BUILDER = 128;

    public static final int CANONICAL = 1;
    public static final int INCL_NS = 2;
    public static final int WITH_COMMENTS = 4;
    public static final int SUBSETS = 8;
    public static final int EXCLUSIVE = 16;

    public SaveContextVisitor(int options, CharSequence indent, String encoding, boolean htmlDoc, boolean fragment, int canonicalOpts) {
        buffer = new StringBuilder();
        this.encoding = encoding;
        indentation = new Stack<String>(); indentation.push("");
        this.htmlDoc = htmlDoc;
        this.fragment = fragment;
        c14nNodeList = new ArrayList<Node>();
        c14nNamespaceStack = new ArrayDeque<Attr[]>();
        c14nAttrStack = new ArrayDeque<Attr[]>();
        format = (options & FORMAT) == FORMAT;

        noDecl = (options & NO_DECL) == NO_DECL;
        noEmpty = (options & NO_EMPTY) == NO_EMPTY;
        noXhtml = (options & NO_XHTML) == NO_XHTML;
        asXhtml = (options & AS_XHTML) == AS_XHTML;
        asXml = (options & AS_XML) == AS_XML;
        asHtml = (options & AS_HTML) == AS_HTML;
        asBuilder = (options & AS_BUILDER) == AS_BUILDER;

        canonical = (canonicalOpts & CANONICAL) == CANONICAL;
        incl_ns = (canonicalOpts & INCL_NS) == INCL_NS;
        with_comments = (canonicalOpts & WITH_COMMENTS) == WITH_COMMENTS;
        subsets = (canonicalOpts & SUBSETS) == SUBSETS;

        if ((format && indent == null) || (format && indent.length() == 0)) indent = "  "; // default, two spaces
        if ((!format && indent != null) && indent.length() > 0) format = true;
        if ((asBuilder && indent == null) || (asBuilder && indent.length() == 0)) indent = "  "; // default, two spaces
        indentString = indent;
        if (!asXml && !asHtml && !asXhtml && !asBuilder) asXml = true;
    }

    @Override
    public String toString() {
        return buffer.toString();
    }

    public StringBuilder getInternalBuffer() { return buffer; }

    public void setHtmlDoc(boolean htmlDoc) {
        this.htmlDoc = htmlDoc;
    }

    public void setEncoding(String encoding) {
        this.encoding = encoding;
    }

    public boolean enter(Node node) {
        if (node instanceof Document) {
            return enter((Document)node);
        }
        if (node instanceof Element) {
            return enter((Element)node);
        }
        if (node instanceof Attr) {
            return enter((Attr)node);
        }
        if (node instanceof Text) {
            return enter((Text)node);
        }
        if (node instanceof CDATASection) {
            return enter((CDATASection)node);
        }
        if (node instanceof Comment) {
            return enter((Comment)node);
        }
        if (node instanceof DocumentType) {
            return enter((DocumentType)node);
        }
        if (node instanceof Entity) {
            return enter((Entity)node);
        }
        if (node instanceof EntityReference) {
            return enter((EntityReference) node);
        }
        if (node instanceof Notation) {
            return enter((Notation)node);
        }
        if (node instanceof ProcessingInstruction) {
            return enter((ProcessingInstruction)node);
        }
        return false;
    }

    public void leave(Node node) {
        if (node instanceof Document) {
            leave((Document)node);
            return;
        }
        if (node instanceof Element) {
            leave((Element)node);
            return;
        }
        if (node instanceof Attr) {
            leave((Attr)node);
            return;
        }
        if (node instanceof Text) {
            return;
        }
        if (node instanceof CDATASection) {
            leave((CDATASection)node);
            return;
        }
        if (node instanceof Comment) {
            leave((Comment)node);
            return;
        }
        if (node instanceof DocumentType) {
            leave((DocumentType)node);
            return;
        }
        if (node instanceof Entity) {
            leave((Entity)node);
            return;
        }
        if (node instanceof EntityReference) {
            leave((EntityReference) node);
            return;
        }
        if (node instanceof Notation) {
            leave((Notation)node);
            return;
        }
        if (node instanceof ProcessingInstruction) {
            leave((ProcessingInstruction)node);
            return;
        }
    }

    public boolean enter(String string) {
        buffer.append(string);
        return true;
    }

    public void leave(String string) {
        // no-op
    }

    public boolean enter(Attr attr) {
        String name = attr.getName();
        buffer.append(name);
        if (!asHtml || !isHtmlBooleanAttr(name)) {
            buffer.append('=');
            buffer.append('"');
            String value = replaceCharsetIfNecessary(attr);
            buffer.append(serializeAttrTextContent(value, htmlDoc));
            buffer.append('"');
        }
        return true;
    }

    private static final Pattern CHARSET =
        Pattern.compile("charset(()|\\s+)=(()|\\s+)(\\w|\\_|\\.|\\-)+", Pattern.CASE_INSENSITIVE);

    private String replaceCharsetIfNecessary(Attr attr) {
        String value = attr.getValue();
        if (encoding == null) return value;   // unable to replace in any case
        if (!"content".equals(attr.getName().toLowerCase())) return value;  // must be content attr
        if (!"meta".equals(attr.getOwnerElement().getNodeName().toLowerCase())) return value;
        Matcher m = CHARSET.matcher(value);
        if (!m.find()) return value;
        if (value.contains(encoding)) return value;  // no need to replace
        return value.replace(m.group(), "charset=" + encoding);
    }

    static final Set<String> HTML_BOOLEAN_ATTRS;
    static {
        final String[] _HTML_BOOLEAN_ATTRS = {
            "checked", "compact", "declare", "defer", "disabled", "ismap",
            "multiple", "nohref", "noresize", "noshade", "nowrap", "readonly",
            "selected"
        };
        HTML_BOOLEAN_ATTRS = new HashSet<String>(Arrays.asList(_HTML_BOOLEAN_ATTRS));
    }

    private static boolean isHtmlBooleanAttr(String name) {
        return HTML_BOOLEAN_ATTRS.contains(name);
    }

    private static CharSequence serializeAttrTextContent(String str, boolean htmlDoc) {
        if (str == null || str.length() == 0) return "";

        StringBuilder buffer = new StringBuilder(str.length() + 16);

        for (int i = 0; i < str.length(); i++) {
            char c; switch (c = str.charAt(i)) {
                case '\n': buffer.append("&#10;"); break;
                case '\r': buffer.append("&#13;"); break;
                case '\t': buffer.append("&#9;"); break;
                case '"': if (htmlDoc) buffer.append("%22");
                else buffer.append("&quot;");
                    break;
                case '<': buffer.append("&lt;"); break;
                case '>': buffer.append("&gt;"); break;
                case '&': buffer.append("&amp;"); break;
                default: buffer.append(c);
            }
        }

        return buffer;
    }

    public void leave(Attr attr) {
        // no-op
    }

    public boolean enter(CDATASection cdata) {
        buffer.append("<![CDATA[");
        buffer.append(cdata.getData());
        buffer.append("]]>");
        return true;
    }

    public void leave(CDATASection cdata) {
        // no-op
    }

    public boolean enter(Comment comment) {
        if (canonical) {
            c14nNodeList.add(comment);
            if (!with_comments) return true;
        }
        buffer.append("<!--");
        buffer.append(comment.getData());
        buffer.append("-->");
        return true;
    }

    public void leave(Comment comment) {
        // no-op
    }

    public boolean enter(Document document) {
        if (!noDecl) {
            buffer.append("<?xml version=\"");
            buffer.append(document.getXmlVersion());
            buffer.append("\"");

            if (encoding != null) {
                buffer.append(" encoding=\"");
                buffer.append(encoding);
                buffer.append("\"");
            }
            buffer.append("?>\n");
        }
        return true;
    }

    public void leave(Document document) {
        // no-op
    }

    public boolean enter(DocumentType docType) {
        if (canonical) {
            c14nNodeList.add(docType);
            return true;
        }
        String name = docType.getName();
        String pubId = docType.getPublicId();
        String sysId = docType.getSystemId();
        String internalSubset = docType.getInternalSubset();
        if (docType.getPreviousSibling() != null) {
            buffer.append('\n');
        }
        buffer.append("<!DOCTYPE ").append(name).append(' ');
        if (pubId != null) {
            buffer.append("PUBLIC \"").append(pubId).append('"');
            if (sysId != null) buffer.append(" \"").append(sysId).append('"');
        } else if (sysId != null) {
            buffer.append("SYSTEM \"").append(sysId).append('"');
        }
        if (internalSubset != null) {
            buffer.append(' ').append('[');
            buffer.append(internalSubset);
            buffer.append(']');
        }
        buffer.append(">\n");
        return true;
    }

    public void leave(DocumentType docType) {
        // no-op
    }

    public boolean enter(Element element) {
        if (canonical) {
            c14nNodeList.add(element);
            if (element == element.getOwnerDocument().getDocumentElement()) {
                c14nNodeList.add(element.getOwnerDocument());
            }
        }
        String current = indentation.peek();
        buffer.append(current);
        if (needIndent(element)) {
            indentation.push(current + indentString);
        }
        String name = element.getTagName();
        buffer.append('<').append(name);
        Attr[] attrs = getAttrsAndNamespaces(element);
        for (Attr attr : attrs) {
            if (attr.getSpecified()) {
                buffer.append(' ');
                enter(attr);
                leave(attr);
            }
        }
        if (element.hasChildNodes()) {
            buffer.append('>');
            if (needBreakInOpening(element)) buffer.append('\n');
            return true;
        }
        // no child
        if (asHtml) {
            buffer.append('>');
        } else if (asXml && noEmpty) {
            buffer.append('>');
        } else if (asXhtml) {
            if (isEmpty(name)) {
                buffer.append(" />"); // see http://www.w3.org/TR/xhtml1/#C_2
            } else {
                buffer.append('>');
            }
        } else {
            buffer.append("/>");
        }
        if (needBreakInOpening(element)) {
            buffer.append('\n');
        }
        return true;
    }

    private boolean needIndent(Element element) {
        if (containsText(element)) return false;
        if (fragment) return false;  // a given option might be fragment and format. fragment matters
        if (format || asBuilder) return true;
        return false;
    }

    private boolean needBreakInOpening(Element element) {
        if (containsText(element)) return false;
        if (fragment) return false;
        if (format) return true;
        if (asBuilder && element.getFirstChild() != null && element.getFirstChild().getNodeType() == Node.ELEMENT_NODE) return true;
        if (format && element.getNextSibling() == null && element.hasChildNodes()) return true;
        return false;
    }

    private boolean isEmpty(String name) {
        HTMLElements.Element element = HTMLElements.getElement(name);
        return element.isEmpty();
    }

    private Attr[] getAttrsAndNamespaces(Element element) {
        NamedNodeMap attrs = element.getAttributes();
        if (!canonical) {
            if (attrs == null || attrs.getLength() == 0) return new Attr[0];
            Attr[] attrsAndNamespaces = new Attr[attrs.getLength()];
            for (int i=0; i<attrs.getLength(); i++) {
                attrsAndNamespaces[i] = (Attr) attrs.item(i);
            }
            return attrsAndNamespaces;
        } else {
            List<Attr> namespaces = new ArrayList<Attr>();
            List<Attr> attributes = new ArrayList<Attr>();
            if (subsets) {
                getAttrsOfAncestors(element.getParentNode(), namespaces, attributes);
                Attr[] namespaceOfAncestors = getSortedArray(namespaces);
                Attr[] attributeOfAncestors = getSortedArray(attributes);
                c14nNamespaceStack.push(namespaceOfAncestors);
                c14nAttrStack.push(attributeOfAncestors);
                subsets = false; // namespace propagation should be done only once on top level node.
            }

            getNamespacesAndAttrs(element, namespaces, attributes);

            Attr[] namespaceArray = getSortedArray(namespaces);
            Attr[] attributeArray = getSortedArray(attributes);
            Attr[] allAttrs = new Attr[namespaceArray.length + attributeArray.length];
            for (int i=0; i<allAttrs.length; i++) {
                if (i < namespaceArray.length) {
                    allAttrs[i] = namespaceArray[i];
                } else {
                    allAttrs[i] = attributeArray[i-namespaceArray.length];
                }
            }
            c14nNamespaceStack.push(namespaceArray);
            c14nAttrStack.push(attributeArray);
            return allAttrs;
        }

    }

    private void getAttrsOfAncestors(Node parent, List<Attr> namespaces, List<Attr> attributes) {
        if (parent == null) return;
        NamedNodeMap attrs = parent.getAttributes();
        if (attrs == null || attrs.getLength() == 0) return;
        for (int i=0; i < attrs.getLength(); i++) {
            Attr attr = (Attr)attrs.item(i);
            if (isNamespace(attr.getNodeName())) namespaces.add(attr);
            else attributes.add(attr);
        }
        getAttrsOfAncestors(parent.getParentNode(), namespaces, attributes);
    }

    private void getNamespacesAndAttrs(Node current, List<Attr> namespaces, List<Attr> attributes) {
        NamedNodeMap attrs = current.getAttributes();
        for (int i=0; i<attrs.getLength(); i++) {
            Attr attr = (Attr)attrs.item(i);
            if (isNamespace(attr.getNodeName())) {
                getNamespacesWithPropagated(namespaces, attr);
            } else {
                getAttributesWithPropagated(attributes, attr);
            }
            if (exclusive) {
                verifyXmlSpace(attributes, attrs);
            }
        }
    }

    private void getNamespacesWithPropagated(List<Attr> namespaces, Attr attr) {
        boolean newNamespace = true;
        Iterator<Attr[]> iter = c14nNamespaceStack.iterator();
        while (iter.hasNext()) {
            Attr[] parentNamespaces = iter.next();
            for (int n=0; n < parentNamespaces.length; n++) {
                if (parentNamespaces[n].getNodeName().equals(attr.getNodeName())) {
                   if (parentNamespaces[n].getNodeValue().equals(attr.getNodeValue())) {
                       // exactly the same namespace should not be added
                       newNamespace = false;
                   } else {
                       // in case of namespace url change, propagated namespace will be override
                       namespaces.remove(parentNamespaces[n]);
                   }
                }
            }
            if (newNamespace && !namespaces.contains(attr)) namespaces.add(attr);
        }
    }

    private void getAttributesWithPropagated(List<Attr> attributes, Attr attr) {
        boolean newAttribute = true;
        Iterator<Attr[]> iter = c14nAttrStack.iterator();
        while (iter.hasNext()) {
            Attr[] parentAttr = iter.next();
            for (int n=0; n < parentAttr.length; n++) {
                if (!parentAttr[n].getNodeName().startsWith("xml:")) continue;
                if (parentAttr[n].getNodeName().equals(attr.getNodeName())) {
                   if (parentAttr[n].getNodeValue().equals(attr.getNodeValue())) {
                       // exactly the same attribute should not be added
                       newAttribute = false;
                   } else {
                       // in case of attribute value change, propagated attribute will be override
                       attributes.remove(parentAttr[n]);
                   }
                }
            }
            if (newAttribute) attributes.add(attr);
        }
    }

    private void verifyXmlSpace(List<Attr> attributes, NamedNodeMap attrs) {
        Attr attr = (Attr) attrs.getNamedItem("xml:space");
        if (attr == null) {
            for (int i=0; i < attributes.size(); i++) {
                if (attributes.get(i).getNodeName().equals("xml:space")) {
                    attributes.remove(i);
                    break;
                }
            }
        }
    }

    private Attr[] getSortedArray(List<Attr> attrList) {
        Attr[] attrArray = attrList.toArray(new Attr[0]);
        Arrays.sort(attrArray, new Comparator<Attr>() {
            @Override
            public int compare(Attr attr0, Attr attr1) {
                return attr0.getNodeName().compareTo(attr1.getNodeName());
            }
        });
        return attrArray;
    }

    public void leave(Element element) {
        if (canonical) {
            c14nNamespaceStack.poll();
            c14nAttrStack.poll();
        }
        String name = element.getTagName();
        if (element.hasChildNodes()) {
            if (needIndentInClosing(element)) {
                indentation.pop();
                buffer.append(indentation.peek());
            } else if (asBuilder) {
                if (!containsText(element)) indentation.pop();
            }
            buffer.append("</").append(name).append('>');
            if (needBreakInClosing(element)) {
                buffer.append('\n');
            }
            return;
        }
        // no child, but HTML might need a closing tag.
        if (asHtml || noEmpty) {
            if (!isEmpty(name) && noEmpty) {
                buffer.append("</").append(name).append('>');
            }
        }
        if (needBreakInClosing(element)) {
            if (!containsText(element)) indentation.pop();
            buffer.append('\n');
        }
    }

    private boolean needIndentInClosing(Element element) {
        if (containsText(element)) return false;

        if (fragment) return false;  // a given option might be fragment and format. fragment matters
        if (format) return true;
        if (asBuilder && element.getFirstChild() != null && element.getFirstChild().getNodeType() == Node.ELEMENT_NODE) return true;
        return false;
    }

    private boolean needBreakInClosing(Element element) {
        if (fragment) return false;
        if (format || asBuilder) return true;
        return false;
    }

    private boolean containsText(Element element) {
        return (element.getFirstChild() != null && element.getFirstChild().getNodeType() == Node.TEXT_NODE);
    }

    public boolean enter(Entity entity) {
        String name = entity.getNodeName();
        String pubId = entity.getPublicId();
        String sysId = entity.getSystemId();
        String notation = entity.getNotationName();
        buffer.append("<!ENTITY ");
        buffer.append(name);
        if (pubId != null) {
            buffer.append(" PUBLIC \"");
            buffer.append(pubId);
            buffer.append("\"");
        }
        if (sysId != null) {
            buffer.append(" SYSTEM \"");
            buffer.append(sysId);
            buffer.append("\"");
        }
        if (notation != null) {
            buffer.append(" NDATA ");
            buffer.append(notation);
        }
        buffer.append(">");
        return true;
    }

    public void leave(Entity entity) {
        // no-op
    }

    public boolean enter(EntityReference entityRef) {
        buffer.append('&').append(entityRef.getNodeName()).append(';');
        return true;
    }
    public void leave(EntityReference entityRef) {
        // no-op
    }

    public boolean enter(Notation notation) {
        String name = notation.getNodeName();
        String pubId = notation.getPublicId();
        String sysId = notation.getSystemId();
        buffer.append("<!NOTATION ");
        buffer.append(name);
        if (pubId != null) {
            buffer.append(" PUBLIC \"");
            buffer.append(pubId);
            buffer.append("\"");
            if (sysId != null) {
                buffer.append(" \"");
                buffer.append(sysId);
                buffer.append("\"");
            }
        } else if (sysId != null) {
            buffer.append(" SYSTEM \"");
            buffer.append(sysId);
            buffer.append("\"");
        }
        buffer.append(">");
        return true;
    }

    public void leave(Notation notation) {
        // no-op
    }

    public boolean enter(ProcessingInstruction pi) {
        buffer.append("<?");
        buffer.append(pi.getTarget());
        buffer.append(" ");
        buffer.append(pi.getData());
        if (asHtml) buffer.append(">");
        else buffer.append("?>");
        buffer.append("\n");
        if (canonical) c14nNodeList.add(pi);
        return true;
    }

    public void leave(ProcessingInstruction pi) {
        // no-op
    }

    private boolean isHtmlScript(Text text) {
        return htmlDoc && text.getParentNode().getNodeName().equals("script");
    }

    private boolean isHtmlStyle(Text text) {
        return htmlDoc && text.getParentNode().getNodeName().equals("style");
    }

    public boolean enter(Text text) {
        CharSequence textContent = text.getNodeValue();
        if (canonical) {
            c14nNodeList.add(text);
            if (isBlank(textContent)) {
                buffer.append(canonicalizeWhitespace(textContent));
                return true;
            }
        }

        if (shouldEncode(text) && !isHtmlScript(text) && !isHtmlStyle(text)) {
            textContent = encodeJavaString(textContent);
        }

        textContent = encodeStringToHtmlEntity(textContent);
        buffer.append(textContent);
        return true;
    }

    private CharSequence encodeStringToHtmlEntity(CharSequence text) {
        if (encoding == null) return text;

        CharsetEncoder encoder = Charset.forName(encoding).newEncoder();
        StringBuilder sb = new StringBuilder(text.length() + 16);
        // make sure we can handle code points that are higher than 2 bytes
        for ( int i = 0; i < text.length(); ) {
            int code = Character.codePointAt(text, i);
            // TODO not sure about bigger offset then 2 ?!
            int offset = code > 65535 ? 2 : 1;
            CharSequence substr = text.subSequence(i, i + offset);
            boolean canEncode = encoder.canEncode(substr);
            if (canEncode) {
                sb.append(substr);
            }
            else {
                sb.append("&#x").append(Integer.toHexString(code)).append(';');
            }
            i += offset;
        }
        return sb;
    }
}
