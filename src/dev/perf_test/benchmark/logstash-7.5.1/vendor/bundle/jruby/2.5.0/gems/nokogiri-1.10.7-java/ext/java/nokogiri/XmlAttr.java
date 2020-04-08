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
import static nokogiri.internals.NokogiriHelpers.rubyStringToString;
import nokogiri.internals.NokogiriHelpers;
import nokogiri.internals.SaveContextVisitor;

import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.RubyString;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Attr;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

/**
 * Class for Nokogiri::XML::Attr
 *
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */

@JRubyClass(name="Nokogiri::XML::Attr", parent="Nokogiri::XML::Node")
public class XmlAttr extends XmlNode {

    public static final String[] HTML_BOOLEAN_ATTRS = {
        "checked", "compact", "declare", "defer", "disabled", "ismap",
        "multiple", "nohref", "noresize", "noshade", "nowrap", "readonly",
        "selected"
    };

    public XmlAttr(Ruby ruby, Node attr){
        super(ruby, getNokogiriClass(ruby, "Nokogiri::XML::Attr"), attr);
    }

    public XmlAttr(Ruby ruby, RubyClass rubyClass) {
        super(ruby, rubyClass);
    }

    public XmlAttr(Ruby ruby, RubyClass rubyClass, Node attr){
        super(ruby, rubyClass, attr);
    }

    @Override
    protected void init(ThreadContext context, IRubyObject[] args) {
        if (args.length < 2) {
            throw getRuntime().newArgumentError(args.length, 2);
        }

        IRubyObject doc = args[0];
        IRubyObject content = args[1];

        if(!(doc instanceof XmlDocument)) {
            final String msg =
                "document must be an instance of Nokogiri::XML::Document";
            throw getRuntime().newArgumentError(msg);
        }

        XmlDocument xmlDoc = (XmlDocument)doc;
        String str = rubyStringToString(content);
        Node attr = xmlDoc.getDocument().createAttribute(str);
        setNode(context, attr);
    }
    
    
    // this method is called from XmlNode.setNode()
    // if the node is attribute, and its name has prefix "xml"
    // the default namespace should be registered for this attribute
    void setNamespaceIfNecessary(Ruby runtime) {
        if ("xml".equals(node.getPrefix())) {
           XmlNamespace.createDefaultNamespace(runtime, node); 
        }
    }

    private boolean isHtmlBooleanAttr() {
        String name = node.getNodeName().toLowerCase();

        for(String s : HTML_BOOLEAN_ATTRS) {
            if(s.equals(name)) return true;
        }

        return false;
    }

    @Override
    @JRubyMethod(name = {"content", "value", "to_s"})
    public IRubyObject content(ThreadContext context) {
        if (content != null && !content.isNil()) return content;
        if (node == null) return context.getRuntime().getNil();
        String attrValue = ((Attr)node).getValue();
        if (attrValue == null) return context.getRuntime().getNil();
        return RubyString.newString(context.getRuntime(), attrValue);
    }
    
    @JRubyMethod(name = {"value=", "content="})
    public IRubyObject value_set(ThreadContext context, IRubyObject content){
        Attr attr = (Attr) node;
        if (content != null && !content.isNil()) {
            attr.setValue(rubyStringToString(XmlNode.encode_special_chars(context, content)));
        }
        setContent(content);
        return content;
    }

    @Override
    protected IRubyObject getNodeName(ThreadContext context) {
        if (name != null) return name;
        String attrName = ((Attr)node).getName();
        if (!(doc instanceof HtmlDocument) && node.getNamespaceURI() != null) {
            attrName = NokogiriHelpers.getLocalPart(attrName);
        }
        return attrName == null ? context.getRuntime().getNil() : RubyString.newString(context.getRuntime(), attrName);
    }

    @Override
    public void accept(ThreadContext context, SaveContextVisitor visitor) {
        visitor.enter((Attr)node);
        visitor.leave((Attr)node);
    }
    
    private boolean isHtml(ThreadContext context) {
        return document(context).getMetaClass().isKindOfModule(getNokogiriClass(context.getRuntime(), "Nokogiri::HTML::Document"));
    }

    @Override
    public IRubyObject unlink(ThreadContext context) {
        Attr attr = (Attr) node;
        Element parent = attr.getOwnerElement();
        parent.removeAttributeNode(attr);

        return this;
    }

}
