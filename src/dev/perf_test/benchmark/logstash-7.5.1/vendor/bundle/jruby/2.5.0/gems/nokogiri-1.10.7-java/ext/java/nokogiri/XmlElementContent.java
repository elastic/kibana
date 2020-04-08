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
import static nokogiri.internals.NokogiriHelpers.nonEmptyStringOrNil;

import org.cyberneko.dtd.DTDConfiguration;
import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.RubyObject;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

/**
 * DTD element content model. This converts the nice tree of content
 * model declarations returned by NekoDTD into the convoluted binary
 * tree used by libxml.
 *
 * @author Patrick Mahoney <pat@polycrystal.org>
 */
@JRubyClass(name="Nokogiri::XML::ElementContent")
public class XmlElementContent extends RubyObject {
    protected String element_name = null;

    protected String name;
    protected Type type;
    protected Occur occur;
    protected IRubyObject left;
    protected IRubyObject right;

    /** values hardcoded from nokogiri/xml/element_content.rb; this
     * makes me uneasy, but it works */
    public enum Type {
        PCDATA (1),
        ELEMENT (2),
        SEQ (3),
        OR (4);

        private final int value;
        Type(int value) {
            this.value = value;
        }
        public IRubyObject value(Ruby runtime) {
            return runtime.newFixnum(value);
        }
    }

    public enum Occur {
        ONCE (1),
        OPT (2),
        MULT (3),
        PLUS (4);

        private final int value;
        Occur(int value) {
            this.value = value;
        }
        public IRubyObject value(Ruby runtime) {
            return runtime.newFixnum(value);
        }
    }

    public XmlElementContent(Ruby runtime, RubyClass klass,
                             XmlDocument document, Node node) {
        this(runtime, klass, document, new NodeIter(node));
        element_name = ((Element)node).getAttribute("ename");

        /*
         * This is a bit of a hack to match libxml behavior.
         *
         * If the tree contains but a single group with a single
         * element, we can simply return the bare element without the
         * surrounding group.
         *
         * TODO: is SEQ/ONCE with a single child the only case for
         * reduction?
         *
         * - pmahoney
         */
        if (!this.left.isNil()) {
            XmlElementContent left = (XmlElementContent) this.left;
            if (type == Type.SEQ &&
                occur == Occur.ONCE &&
                left.type == Type.ELEMENT &&
                right.isNil()) {
                this.name = left.name;
                this.type = left.type;
                this.occur = left.occur;
                this.left = this.right; // both nil
            }
        }
    }

    public XmlElementContent(Ruby runtime, XmlDocument document, Node node) {
        this(runtime, getNokogiriClass(runtime, "Nokogiri::XML::ElementContent"), document, node);
    }

    public XmlElementContent(Ruby runtime, RubyClass klass,
                             XmlDocument doc, NodeIter iter) {
        super(runtime, klass);

        setInstanceVariable("@document", doc);

        name = null;
        type = Type.SEQ;
        occur = Occur.ONCE;
        left = runtime.getNil();
        right = runtime.getNil();

        apply(runtime, klass, doc, iter);
    }

    protected XmlElementContent(Ruby runtime, RubyClass klass,
                                Type type, XmlDocument doc, NodeIter iter,
                                XmlElementContent left) {
        super(runtime, klass);

        setInstanceVariable("@document", doc);

        name = null;
        this.type = type;
        occur = Occur.ONCE;
        this.left = left;
        right = runtime.getNil();

        switch (type) {
        case SEQ:
        case OR:
            applyGroup(runtime, klass, doc, iter);
        default:
            // noop
        }
    }

    /**
     * Applies the current node in <code>iter</code> to this content
     * model.  When finished, <code>iter</code> will point to the last
     * processed node.
     */
    protected void apply(Ruby runtime, RubyClass klass,
                         XmlDocument doc,
                         NodeIter iter) {
        if (iter.isNull()) return;

        Element elem = (Element) iter.current();

        if (isGroup(elem) && iter.hasChildren()) {
            iter.firstChild();
            applyGroup(runtime, klass, doc, iter);
            iter.parent();
        } else if (isElement(elem)) {
            name = elem.getAttribute("name");
            type = Type.ELEMENT;
        }

        iter.nextSibling();
        if (iter.isNull()) return;
        if (isOccurrence(iter.current())) {
            setOccur(((Element)iter.current()).getAttribute("type"));
            iter.nextSibling();
        }
    }

    protected void applyGroup(Ruby runtime, RubyClass klass,
                              XmlDocument doc, NodeIter iter) {
        // LEFT branch

        if (iter.isNull()) return;

        if (left.isNil()) {
            left = new XmlElementContent(runtime, klass, doc, iter);

            if (iter.isNull()) return;

            if (isSeparator(iter.current())) {
                setType(((Element)iter.current()).getAttribute("type"));
                iter.nextSibling(); // skip separator
            }
        }

        // RIGHT branch

        if (iter.isNull()) return;

        right = new XmlElementContent(runtime, klass, doc, iter);

        if (iter.isNull()) return;
        if (isSeparator(iter.current()))
                iter.nextSibling(); // skip separator
        if (iter.isNull()) return;

        // binary tree can only hold two children.  If we have more,
        // the right child is another tree with the same sequence
        // "type".  The "left" of the new tree is what we've
        // currently consumed as our "right" branch of this tree.
        right = new XmlElementContent(runtime, klass, type, doc, iter,
                                      (XmlElementContent) right);
    }

    /**
     * Set the type based on the separator node type string.
     */
    protected void setType(String type) {
        if ("|".equals(type)) this.type = Type.OR;
        else if (",".equals(type)) this.type = Type.SEQ;
    }

    protected void setOccur(String type) {
        if ("*".equals(type)) this.occur = Occur.MULT;
        else if ("+".equals(type)) this.occur = Occur.PLUS;
    }

    public static boolean isGroup(Node node) {
        return XmlDtd.nameEquals(node, DTDConfiguration.E_GROUP);
    }

    // content model element, not Element node type
    public static boolean isElement(Node node) {
        return XmlDtd.nameEquals(node, DTDConfiguration.E_ELEMENT);
    }

    public static boolean isSeparator(Node node) {
        return XmlDtd.nameEquals(node, DTDConfiguration.E_SEPARATOR);
    }

    public static boolean isOccurrence(Node node) {
        return XmlDtd.nameEquals(node, DTDConfiguration.E_OCCURRENCE);
    }

    /**
     * Return the name of the element to which this content model
     * applies.  Only works for the root of the tree.
     */
    public IRubyObject element_name(ThreadContext context) {
        return nonEmptyStringOrNil(context.getRuntime(), element_name);
    }

    @JRubyMethod
    public IRubyObject prefix(ThreadContext context) {
        return nonEmptyStringOrNil(context.getRuntime(), getPrefix(name));
    }

    @JRubyMethod
    public IRubyObject name(ThreadContext context) {
        return nonEmptyStringOrNil(context.getRuntime(), getLocalPart(name));
    }

    @JRubyMethod
    public IRubyObject type(ThreadContext context) {
        return type.value(context.getRuntime());
    }

    @JRubyMethod
    public IRubyObject occur(ThreadContext context) {
        return occur.value(context.getRuntime());
    }

    @JRubyMethod
    public IRubyObject c1(ThreadContext context) {
        return left;
    }

    @JRubyMethod
    public IRubyObject c2(ThreadContext context) {
        return right;
    }

    /**
     * Iterator for a tree of Nodes.  Has a current position that
     * points to a given node. Calling nextSibling() on the last
     * sibling results in a current position of null.  This position
     * is not fatal and can be escaped by calling parent() (which
     * moves to the parent of previous sibling).  The null position is
     * used to indicate the end of a list.
     */
    protected static class NodeIter {
        protected Node pre;
        protected Node cur;

        /**
         * The first time, we fake a previous sibling element.  Thus,
         * initially, current() is null, and the first call should be
         * nextSibling().
         */
        public NodeIter(Node node) {
            pre = null;
            cur = node.getFirstChild(); // skip root contentModel node
        }

        public Node current() {
            return cur;
        }

        public boolean isNull() {
            return (cur == null);
        }

        public boolean hasChildren() {
            return (cur != null && cur.hasChildNodes());
        }

        /**
         * Descend to the first child.
         */
        public Node firstChild() {
            if (cur == null) throw new RuntimeException("no children");
            Node ch = cur.getFirstChild();
            if (ch == null) throw new RuntimeException("no children");

            cur = ch;
            return cur;
        }

        /**
         * Move to the next sibling
         */
        public Node nextSibling() {
            if (cur == null) {
                throw new RuntimeException("no next sibling");
            } else {
                Node ns = cur.getNextSibling();
                if (ns == null) {
                    pre = cur;
                    cur = null;
                } else {
                    cur = ns;
                }
                return cur;
            }
        }

        /**
         * Move to the parent.
         */
        public Node parent() {
            if (cur == null) cur = pre;

            Node p = cur.getParentNode();
            if (p == null) throw new RuntimeException("no parent");

            cur = p;
            return cur;
        }
    }
}
