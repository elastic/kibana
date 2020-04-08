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

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.cyberneko.html.HTMLElements;
import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.RubyObject;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;

/**
 * Class for Nokogiri::HTML::ElementDescription.
 * 
 * @author Patrick Mahoney <pat@polycrystal.org>
 */
@JRubyClass(name="Nokogiri::HTML::ElementDescription")
public class HtmlElementDescription extends RubyObject {

    /**
     * Stores memoized hash of element -> list of valid subelements.
     */
    static protected Map<Short, List<String>> subElements;
    static {
        Map<Short, List<String>> _subElements =
            new HashMap<Short, List<String>>();
        subElements = Collections.synchronizedMap(_subElements);
    }

    protected HTMLElements.Element element;

    public HtmlElementDescription(Ruby runtime, RubyClass rubyClass) {
        super(runtime, rubyClass);
    }

    /**
     * Lookup the list of sub elements of <code>code</code>.  If not
     * already stored, iterate through all elements to find valid
     * subelements; save this list and return it.
     */
    protected static List<String> findSubElements(HTMLElements.Element elem) {
        List<String> subs = subElements.get(elem.code);

        if (subs == null) {
            subs = new ArrayList<String>();

            /*
             * A bit of a hack.  NekoHtml source code shows that
             * UNKNOWN is the highest value element.  We cannot access
             * the list of elements directly because it's protected.
             */
            for (short c = 0; c < HTMLElements.UNKNOWN; c++) {
                HTMLElements.Element maybe_sub =
                    HTMLElements.getElement(c);
                if (maybe_sub.isParent(elem)) {
                    subs.add(maybe_sub.name);
                }
            }

            subElements.put(elem.code, subs);
        }

        return subs;
    }

    @JRubyMethod(name="[]", meta=true)
    public static IRubyObject get(ThreadContext context,
                                  IRubyObject klazz, IRubyObject name) {

        // nekohtml will return an element even for invalid names, see
        // http://sourceforge.net/p/nekohtml/code/HEAD/tree/trunk/src/org/cyberneko/html/HTMLElements.java#l514
        // which breaks `test_fetch_nonexistent'
        HTMLElements.Element elem = HTMLElements.getElement(name.asJavaString(), HTMLElements.NO_SUCH_ELEMENT);
        if (elem == HTMLElements.NO_SUCH_ELEMENT)
            return context.nil;

        HtmlElementDescription desc =
            new HtmlElementDescription(context.getRuntime(), (RubyClass)klazz);
        desc.element = elem;
        return desc;
    }

    @JRubyMethod()
    public IRubyObject name(ThreadContext context) {
        return context.getRuntime().newString(element.name.toLowerCase());
    }

    @JRubyMethod(name="inline?")
    public IRubyObject inline_eh(ThreadContext context) {
        return context.getRuntime().newBoolean(element.isInline());
    }

    @JRubyMethod(name="empty?")
    public IRubyObject empty_eh(ThreadContext context) {
        return context.getRuntime().newBoolean(element.isEmpty());
    }

    @JRubyMethod()
    public IRubyObject sub_elements(ThreadContext context) {
        Ruby ruby = context.getRuntime();
        List<String> subs = findSubElements(element);
        IRubyObject[] ary = new IRubyObject[subs.size()];
        for (int i = 0; i < subs.size(); ++i) {
            ary[i] = ruby.newString(subs.get(i));
        }

        return ruby.newArray(ary);
    }

}
