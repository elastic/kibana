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

import static nokogiri.internals.NokogiriHelpers.getCachedNodeOrCreate;
import static nokogiri.internals.NokogiriHelpers.rubyStringToString;
import nokogiri.internals.SaveContextVisitor;

import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.anno.JRubyClass;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.Text;

/**
 * Class for Nokogiri::XML::Text
 *
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */
@JRubyClass(name="Nokogiri::XML::Text", parent="Nokogiri::XML::CharacterData")
public class XmlText extends XmlNode {

    public XmlText(Ruby runtime, RubyClass rubyClass, Node node) {
        super(runtime, rubyClass, node);
    }

    public XmlText(Ruby runtime, RubyClass klass) {
        super(runtime, klass);
    }

    @Override
    protected void init(ThreadContext context, IRubyObject[] args) {
        if (args.length < 2) {
            throw getRuntime().newArgumentError(args.length, 2);
        }

        content = args[0];
        IRubyObject xNode = args[1];

        XmlNode xmlNode = asXmlNode(context, xNode);
        XmlDocument xmlDoc = (XmlDocument)xmlNode.document(context);
        doc = xmlDoc;
        Document document = xmlDoc.getDocument();
        // text node content should not be encoded when it is created by Text node.
        // while content should be encoded when it is created by Element node.
        Node node = document.createTextNode(rubyStringToString(content));
        setNode(context, node);
    }
    
    @Override
    protected IRubyObject getNodeName(ThreadContext context) {
        if (name == null) name = context.getRuntime().newString("text");
        return name;
    }

    @Override
    public void accept(ThreadContext context, SaveContextVisitor visitor) {
        visitor.enter((Text)node);
        Node child = node.getFirstChild();
        while (child != null) {
            IRubyObject nokoNode = getCachedNodeOrCreate(context.getRuntime(), child);
            if (nokoNode instanceof XmlNode) {
                XmlNode cur = (XmlNode) nokoNode;
                cur.accept(context, visitor);
            } else if (nokoNode instanceof XmlNamespace) {
                XmlNamespace cur = (XmlNamespace) nokoNode;
                cur.accept(context, visitor);
            }
            child = child.getNextSibling();
        }
        visitor.leave(node);
    }
}
