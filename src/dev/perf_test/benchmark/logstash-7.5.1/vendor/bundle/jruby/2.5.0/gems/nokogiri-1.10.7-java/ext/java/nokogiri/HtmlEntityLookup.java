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

import static org.jruby.runtime.Helpers.invoke;

import org.cyberneko.html.HTMLEntities;
import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.RubyObject;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;

/**
 * Class for Nokogiri::HTML::EntityLookup.
 * 
 * @author Patrick Mahoney <pat@polycrystal.org>
 */
@JRubyClass(name="Nokogiri::HTML::EntityLookup")
public class HtmlEntityLookup extends RubyObject {

    public HtmlEntityLookup(Ruby runtime, RubyClass rubyClass) {
        super(runtime, rubyClass);
    }

    /**
     * Looks up an HTML entity <code>key</code>.
     *
     * The description is a bit lacking.
     */
    @JRubyMethod()
    public IRubyObject get(ThreadContext context, IRubyObject key) {
        Ruby ruby = context.getRuntime();
        String name = key.toString();
        int val = HTMLEntities.get(name);
        if (val == -1) return ruby.getNil();

        IRubyObject edClass =
            ruby.getClassFromPath("Nokogiri::HTML::EntityDescription");
        IRubyObject edObj = invoke(context, edClass, "new",
                                   ruby.newFixnum(val), ruby.newString(name),
                                   ruby.newString(name + " entity"));

        return edObj;
    }

}
