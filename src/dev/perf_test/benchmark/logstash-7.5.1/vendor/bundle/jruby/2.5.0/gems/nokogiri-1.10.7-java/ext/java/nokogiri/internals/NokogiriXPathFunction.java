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

import java.util.List;

import javax.xml.xpath.XPathFunction;
import javax.xml.xpath.XPathFunctionException;

import org.jruby.Ruby;
import org.jruby.RubyArray;
import org.jruby.RubyBoolean;
import org.jruby.RubyFixnum;
import org.jruby.RubyFloat;
import org.jruby.RubyInteger;
import org.jruby.RubyString;
import org.jruby.javasupport.JavaUtil;
import org.jruby.runtime.Helpers;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.NodeList;

import nokogiri.XmlNode;
import nokogiri.XmlNodeSet;

/**
 * Xpath function handler.
 * 
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */
public class NokogiriXPathFunction implements XPathFunction {

    private final IRubyObject handler;
    private final String name;
    private final int arity;
    
    public static NokogiriXPathFunction create(IRubyObject handler, String name, int arity) {
        return new NokogiriXPathFunction(handler, name, arity);
    }

    private NokogiriXPathFunction(IRubyObject handler, String name, int arity) {
        this.handler = handler;
        this.name = name;
        this.arity = arity;
    }

    public Object evaluate(List args) throws XPathFunctionException {
        if (args.size() != this.arity) {
            throw new XPathFunctionException("arity does not match");
        }
        
        final Ruby runtime = this.handler.getRuntime();
        ThreadContext context = runtime.getCurrentContext();

        IRubyObject result = Helpers.invoke(context, this.handler, this.name, fromObjectToRubyArgs(runtime, args));

        return fromRubyToObject(runtime, result);
    }

    private static IRubyObject[] fromObjectToRubyArgs(final Ruby runtime, List args) {
        IRubyObject[] newArgs = new IRubyObject[args.size()];
        for(int i = 0; i < args.size(); i++) {
            newArgs[i] = fromObjectToRuby(runtime, args.get(i));
        }
        return newArgs;
    }

    private static IRubyObject fromObjectToRuby(final Ruby runtime, Object obj) {
        // argument object type is one of NodeList, String, Boolean, or Double.
        if (obj instanceof NodeList) {
            XmlNodeSet xmlNodeSet = XmlNodeSet.newEmptyNodeSet(runtime.getCurrentContext());
            xmlNodeSet.setNodeList((NodeList) obj);
            return xmlNodeSet;
        }
        return JavaUtil.convertJavaToUsableRubyObject(runtime, obj);
    }

    private static Object fromRubyToObject(final Ruby runtime, IRubyObject obj) {
        if (obj instanceof RubyString) return obj.asJavaString();
        if (obj instanceof RubyBoolean) return obj.toJava(Boolean.class);
        if (obj instanceof RubyFloat) return obj.toJava(Double.class);
        if (obj instanceof RubyInteger) {
            if ( obj instanceof RubyFixnum ) return RubyFixnum.fix2long(obj);
            return obj.toJava(java.math.BigInteger.class);
        }
        if (obj instanceof XmlNodeSet) return obj;
        if (obj instanceof RubyArray) {
            return XmlNodeSet.newXmlNodeSet(runtime.getCurrentContext(), ((RubyArray) obj).toJavaArray());
        }
        /*if (o instanceof XmlNode)*/ return ((XmlNode) obj).getNode();
    }
}
