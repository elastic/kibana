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

import static nokogiri.internals.NokogiriHelpers.getLocalPart;
import static nokogiri.internals.NokogiriHelpers.getNokogiriClass;
import static nokogiri.internals.NokogiriHelpers.getPrefix;

import org.jruby.Ruby;
import org.jruby.RubyArray;
import org.jruby.RubyClass;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Node;

/**
 * DTD element declaration.
 *
 * @author Patrick Mahoney <pat@polycrystal.org>
 * @author Yoko Harada <yokolet@gmail.com>
 */
@JRubyClass(name="Nokogiri::XML::ElementDecl", parent="Nokogiri::XML::Node")
public class XmlElementDecl extends XmlNode {
    RubyArray attrDecls;
    IRubyObject contentModel;
    
    public XmlElementDecl(Ruby ruby, RubyClass klazz) {
        super(ruby, klazz);
    }
    
    public void setNode(ThreadContext context, Node node) {
        super.setNode(context, node);
        attrDecls = RubyArray.newArray(context.getRuntime());
        contentModel = context.getRuntime().getNil();
    }

    /**
     * Initialize based on an elementDecl node from a NekoDTD parsed
     * DTD.
     */
    public XmlElementDecl(Ruby ruby, RubyClass klass, Node elemDeclNode) {
        super(ruby, klass, elemDeclNode);
        attrDecls = RubyArray.newArray(ruby);
        contentModel = ruby.getNil();
    }

    public static IRubyObject create(ThreadContext context, Node elemDeclNode) {
        XmlElementDecl self =
            new XmlElementDecl(context.getRuntime(),
                               getNokogiriClass(context.getRuntime(), "Nokogiri::XML::ElementDecl"),
                               elemDeclNode);
        return self;
    }

    public IRubyObject element_name(ThreadContext context) {
        return getAttribute(context, "ename");
    }

    public void setContentModel(IRubyObject cm) {
        contentModel = cm;
    }

    @Override
    @JRubyMethod
    public IRubyObject content(ThreadContext context) {
        return contentModel;
    }

    public boolean isEmpty() {
        return "EMPTY".equals(getAttribute("model"));
    }

    @JRubyMethod
    public IRubyObject prefix(ThreadContext context) {
        String enamePrefix = getPrefix(getAttribute("ename"));
        if (enamePrefix == null)
            return context.getRuntime().getNil();
        else
            return context.getRuntime().newString(enamePrefix);
    }

    /**
     * Returns the local part of the element name.
     */
    @Override
    @JRubyMethod
    public IRubyObject node_name(ThreadContext context) {
        String ename = getLocalPart(getAttribute("ename"));
        return context.getRuntime().newString(ename);
    }

    @Override
    @JRubyMethod(name = "node_name=")
    public IRubyObject node_name_set(ThreadContext context, IRubyObject name) {
        throw context.getRuntime()
            .newRuntimeError("cannot change name of DTD decl");
    }

    @Override
    @JRubyMethod
    public IRubyObject attribute_nodes(ThreadContext context) {
        return attrDecls;
    }

    @Override
    @JRubyMethod
    public IRubyObject attribute(ThreadContext context, IRubyObject name) {
        throw context.getRuntime()
            .newRuntimeError("attribute by name not implemented");
    }

    public void appendAttrDecl(XmlAttributeDecl decl) {
        attrDecls.append(decl);
    }

    @JRubyMethod
    public IRubyObject element_type(ThreadContext context) {
        return context.getRuntime().newFixnum(node.getNodeType());
    }
}
