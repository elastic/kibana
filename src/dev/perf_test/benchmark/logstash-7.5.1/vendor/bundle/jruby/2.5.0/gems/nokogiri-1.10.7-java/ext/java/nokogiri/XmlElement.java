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

import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.anno.JRubyClass;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

import nokogiri.internals.SaveContextVisitor;

/**
 * Class for Nokogiri::XML::Element
 * 
 * @author sergio
 * @author Yoko Harada <yokolet@gamil.com>
 */
@JRubyClass(name="Nokogiri::XML::Element", parent="Nokogiri::XML::Node")
public class XmlElement extends XmlNode {

    public XmlElement(Ruby runtime, RubyClass klazz) {
        super(runtime, klazz);
    }

    public XmlElement(Ruby runtime, RubyClass klazz, Node element) {
        super(runtime, klazz, element);
    }
    
    @Override
    public void setNode(ThreadContext context, Node node) {
      super.setNode(context, node);
      if (doc != null)
        setInstanceVariable("@document", doc);
    }
    
    @Override
    public void accept(ThreadContext context, SaveContextVisitor visitor) {
        visitor.enter((Element) node);
        XmlNodeSet xmlNodeSet = (XmlNodeSet) children(context);
        if (xmlNodeSet.length() > 0) {
            IRubyObject[] nodes = XmlNodeSet.getNodes(context, xmlNodeSet);
            for( int i = 0; i < nodes.length; i++ ) {
                Object item = nodes[i];
                if (item instanceof XmlNode) {
                    ((XmlNode) item).accept(context, visitor);
                }
                else if (item instanceof XmlNamespace) {
                    ((XmlNamespace) item).accept(context, visitor);
                }
            }
        }
        visitor.leave((Element) node);
    }
}
