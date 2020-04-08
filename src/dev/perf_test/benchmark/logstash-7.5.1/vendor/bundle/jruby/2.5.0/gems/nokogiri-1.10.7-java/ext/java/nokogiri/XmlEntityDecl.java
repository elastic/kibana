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

import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.RubyFixnum;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Node;

/**
 * DTD entity declaration.
 *
 * @author Patrick Mahoney <pat@polycrystal.org>
 * @author Yoko Harada <yokolet@gmail.com>
 */
@JRubyClass(name="Nokogiri::XML::EntityDecl", parent="Nokogiri::XML::Node")
public class XmlEntityDecl extends XmlNode {
    public static final int INTERNAL_GENERAL = 1;
    public static final int EXTERNAL_GENERAL_PARSED = 2;
    public static final int EXTERNAL_GENERAL_UNPARSED  = 3;
    public static final int INTERNAL_PARAMETER = 4;
    public static final int EXTERNAL_PARAMETER = 5;
    public static final int INTERNAL_PREDEFINED = 6;
    
    private IRubyObject entityType;
    private IRubyObject name;
    private IRubyObject external_id;
    private IRubyObject system_id;
    private IRubyObject content;

    public XmlEntityDecl(Ruby ruby, RubyClass klass) {
        super(ruby, klass);
        throw ruby.newRuntimeError("node required");
    }

    /**
     * Initialize based on an entityDecl node from a NekoDTD parsed
     * DTD.
     */
    public XmlEntityDecl(Ruby ruby, RubyClass klass, Node entDeclNode) {
        super(ruby, klass, entDeclNode);
        entityType = RubyFixnum.newFixnum(ruby, XmlEntityDecl.INTERNAL_GENERAL);
        name = external_id = system_id = content = ruby.getNil();       
    }
    
    public XmlEntityDecl(Ruby ruby, RubyClass klass, Node entDeclNode, IRubyObject[] argv) {
        super(ruby, klass, entDeclNode);
        name = argv[0];
        entityType = RubyFixnum.newFixnum(ruby, XmlEntityDecl.INTERNAL_GENERAL);
        external_id = system_id = content = ruby.getNil(); 
        if (argv.length > 1) entityType = argv[1];
        if (argv.length > 4) {
            external_id = argv[2];
            system_id = argv[3];
            content = argv[4];
        }
    }

    public static IRubyObject create(ThreadContext context, Node entDeclNode) {
        XmlEntityDecl self =
            new XmlEntityDecl(context.getRuntime(),
                              getNokogiriClass(context.getRuntime(), "Nokogiri::XML::EntityDecl"),
                              entDeclNode);
        return self;
    }
    
    // when entity is created by create_entity method
    public static IRubyObject create(ThreadContext context, Node entDeclNode, IRubyObject[] argv) {
        XmlEntityDecl self =
            new XmlEntityDecl(context.getRuntime(),
                              getNokogiriClass(context.getRuntime(), "Nokogiri::XML::EntityDecl"),
                              entDeclNode, argv);
        return self;
    }

    /**
     * Returns the local part of the element name.
     */
    @Override
    @JRubyMethod
    public IRubyObject node_name(ThreadContext context) {
        IRubyObject value = getAttribute(context, "name");
        if (value.isNil()) value = name;
        return value;
    }

    @Override
    @JRubyMethod(name = "node_name=")
    public IRubyObject node_name_set(ThreadContext context, IRubyObject name) {
        throw context.getRuntime()
            .newRuntimeError("cannot change name of DTD decl");
    }

    @JRubyMethod
    public IRubyObject content(ThreadContext context) {
        IRubyObject value = getAttribute(context, "value");
        if (value.isNil()) value = content;
        return value;
    }

    // TODO: what is content vs. original_content?
    @JRubyMethod
    public IRubyObject original_content(ThreadContext context) {
        return getAttribute(context, "value");
    }

    @JRubyMethod
    public IRubyObject system_id(ThreadContext context) {
        IRubyObject value = getAttribute(context, "sysid");
        if (value.isNil()) value = system_id;
        return value;
    }

    @JRubyMethod
    public IRubyObject external_id(ThreadContext context) {
        IRubyObject value = getAttribute(context, "pubid");
        if (value.isNil()) value = external_id;
        return value;
    }

    @JRubyMethod
    public IRubyObject entity_type(ThreadContext context) {
        return entityType;
    }
}
