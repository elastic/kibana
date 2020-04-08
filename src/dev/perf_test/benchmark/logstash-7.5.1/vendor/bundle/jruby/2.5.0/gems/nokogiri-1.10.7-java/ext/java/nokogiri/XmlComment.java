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

import static nokogiri.internals.NokogiriHelpers.rubyStringToString;
import nokogiri.internals.SaveContextVisitor;

import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.anno.JRubyClass;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Comment;
import org.w3c.dom.Document;
import org.w3c.dom.Node;

/**
 * Class for Nokogiri::XML::Comment
 *
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */

@JRubyClass(name="Nokogiri::XML::Comment", parent="Nokogiri::XML::CharacterData")
public class XmlComment extends XmlNode {
    public XmlComment(Ruby ruby, RubyClass rubyClass, Node node) {
        super(ruby, rubyClass, node);
    }

    public XmlComment(Ruby runtime, RubyClass klass) {
        super(runtime, klass);
    }

    @Override
    protected void init(ThreadContext context, IRubyObject[] args) {
        if (args.length < 2)
            throw getRuntime().newArgumentError(args.length, 2);

        IRubyObject doc = args[0];
        IRubyObject text = args[1];

        XmlDocument xmlDoc;
        if (doc instanceof XmlDocument) {
            xmlDoc = (XmlDocument) doc;
            
        } else if (doc instanceof XmlNode) {
            XmlNode xmlNode = (XmlNode) doc;
            xmlDoc = (XmlDocument)xmlNode.document(context);
        } else {
            throw getRuntime().newArgumentError("first argument must be a XML::Document or XML::Node");
        }
        if (xmlDoc != null) {
            Document document = xmlDoc.getDocument();
            Node node = document.createComment(rubyStringToString(text));
            setNode(context, node);
        }
    }

    @Override
    public boolean isComment() { return true; }

    @Override
    public void accept(ThreadContext context, SaveContextVisitor visitor) {
        visitor.enter((Comment)node);
        visitor.leave((Comment)node);
    }
}
