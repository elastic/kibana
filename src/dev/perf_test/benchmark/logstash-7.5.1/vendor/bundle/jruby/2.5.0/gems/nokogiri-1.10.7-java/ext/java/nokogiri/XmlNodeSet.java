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

import static nokogiri.XmlNode.setDocumentAndDecorate;
import static nokogiri.internals.NokogiriHelpers.getNokogiriClass;
import static nokogiri.internals.NokogiriHelpers.nodeListToRubyArray;

import java.util.Arrays;

import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.RubyFixnum;
import org.jruby.RubyObject;
import org.jruby.RubyRange;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.Block;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

/**
 * Class for Nokogiri::XML::NodeSet
 *
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */
@JRubyClass(name="Nokogiri::XML::NodeSet")
public class XmlNodeSet extends RubyObject implements NodeList {

    private IRubyObject[] nodes;

    @JRubyMethod(name = "new", meta = true, rest = true)
    public static IRubyObject rbNew(ThreadContext context, IRubyObject cls,
                                    IRubyObject[] args, Block block) {
      RubyClass klass = (RubyClass) cls;
      XmlNodeSet set = (XmlNodeSet) klass.allocate();
      set.setNodes(new IRubyObject[0]);
      set.callInit(args, block);
      return set;
    }

    public XmlNodeSet(Ruby ruby, RubyClass klazz) {
        super(ruby, klazz);
    }

    private static XmlNodeSet create(final Ruby runtime) {
        return (XmlNodeSet) NokogiriService.XML_NODESET_ALLOCATOR.allocate(runtime, getNokogiriClass(runtime, "Nokogiri::XML::NodeSet"));
    }

    public static XmlNodeSet newEmptyNodeSet(ThreadContext context) {
        XmlNodeSet set = create(context.getRuntime());
        set.nodes = new IRubyObject[0];
        return set;
    }

    public static XmlNodeSet newXmlNodeSet(ThreadContext context, IRubyObject[] nodes) {
        XmlNodeSet xmlNodeSet = create(context.runtime);
        xmlNodeSet.setNodes(nodes);
        return xmlNodeSet;
    }

    /**
     * Create and return a copy of this object.
     *
     * @return a clone of this object
     */
    @Override
    public Object clone() throws CloneNotSupportedException {
        return super.clone();
    }

    void setNodes(IRubyObject[] array) {
        this.nodes = array;

        IRubyObject first = array.length > 0 ? array[0] : null;
        initialize(getRuntime(), first);
    }

    private void setReference(XmlNodeSet reference) {
        IRubyObject first = reference.nodes.length > 0 ? reference.nodes[0] : null;
        initialize(getRuntime(), first);
    }

    public void setNodeList(NodeList nodeList) {
        setNodes(nodeListToRubyArray(getRuntime(), nodeList));
    }

    final void initialize(Ruby runtime, IRubyObject refNode) {
        if (refNode instanceof XmlNode) {
            IRubyObject doc = ((XmlNode) refNode).document(runtime);
            setDocumentAndDecorate(runtime.getCurrentContext(), this, doc);
        }
    }

    public int length() {
      return nodes == null ? 0 : nodes.length;
    }

    public void relink_namespace(ThreadContext context) {
        for (int i = 0; i < nodes.length; i++) {
            if (nodes[i] instanceof XmlNode) {
                ((XmlNode) nodes[i]).relink_namespace(context);
            }
        }
    }

    @JRubyMethod(name="&")
    public IRubyObject op_and(ThreadContext context, IRubyObject nodeSet) {
        IRubyObject[] otherNodes = getNodes(context, nodeSet);

        if (otherNodes == null || otherNodes.length == 0) {
          return newEmptyNodeSet(context);
        }

        if (nodes == null || nodes.length == 0) {
          return newEmptyNodeSet(context);
        }

        IRubyObject[] curr = nodes;
        IRubyObject[] other = getNodes(context, nodeSet);
        IRubyObject[] result = new IRubyObject[nodes.length];

        int last = 0;
outer:
        for (int i = 0; i < curr.length; i++) {
          IRubyObject n = curr[i];

          for (int j = 0; j < other.length; j++) {
            if (other[j] == n) {
              result[last++] = n;
              continue outer;
            }
          }
        }

        XmlNodeSet newSet = newXmlNodeSet(context, Arrays.copyOf(result, last));
        newSet.setReference(this);
        return newSet;
    }

    @JRubyMethod
    public IRubyObject delete(ThreadContext context, IRubyObject node_or_namespace) {
        IRubyObject nodeOrNamespace = asXmlNodeOrNamespace(context, node_or_namespace);

        if (nodes.length == 0) {
          return context.nil;
        }

        IRubyObject[] orig = nodes;
        IRubyObject[] result = new IRubyObject[nodes.length];

        int last = 0;

        for (int i = 0; i < orig.length; i++) {
          IRubyObject n = orig[i];

          if (n == nodeOrNamespace) {
            continue;
          }

          result[last++] = n;
        }

        if (nodeOrNamespace instanceof XmlNamespace) {
          ((XmlNamespace) nodeOrNamespace).deleteHref();
        }

        nodes = Arrays.copyOf(result, last);

        if (nodes.length < orig.length) {
          // if we found the node return it
          return nodeOrNamespace;
        }

        return context.nil;
    }

    @JRubyMethod
    public IRubyObject dup(ThreadContext context) {
        return newXmlNodeSet(context, nodes);
    }

    @JRubyMethod(name = "include?")
    public IRubyObject include_p(ThreadContext context, IRubyObject node_or_namespace) {
        for (int i = 0; i < nodes.length; i++) {
          if (nodes[i] == node_or_namespace) {
            return context.tru;
          }
        }

        return context.runtime.getFalse();
    }

    @JRubyMethod(name = {"length", "size"})
    public IRubyObject length(ThreadContext context) {
        return context.getRuntime().newFixnum(nodes.length);
    }

    @JRubyMethod(name="-")
    public IRubyObject op_diff(ThreadContext context, IRubyObject nodeSet) {
        IRubyObject[] otherNodes = getNodes(context, nodeSet);

        if (otherNodes.length == 0) {
          return dup(context);
        }

        if (nodes.length == 0) {
          return newEmptyNodeSet(context);
        }

        IRubyObject[] curr = nodes;
        IRubyObject[] other = getNodes(context, nodeSet);
        IRubyObject[] result = new IRubyObject[nodes.length];

        int last = 0;
outer:
        for (int i = 0; i < curr.length; i++) {
          IRubyObject n = curr[i];

          for (int j = 0; j < other.length; j++) {
            if (other[j] == n) {
              continue outer;
            }
          }

          result[last++] = n;
        }

        XmlNodeSet newSet = newXmlNodeSet(context, Arrays.copyOf(result, last));
        newSet.setReference(this);
        return newSet;
    }

    @JRubyMethod(name={"|", "+"})
    public IRubyObject op_or(ThreadContext context, IRubyObject nodeSet) {
        IRubyObject[] otherNodes = getNodes(context, nodeSet);

        if (nodes.length == 0) {
          return ((XmlNodeSet) nodeSet).dup(context);
        }

        if (otherNodes.length == 0) {
          return dup(context);
        }

        IRubyObject[] curr = nodes;
        IRubyObject[] other = getNodes(context, nodeSet);
        IRubyObject[] result = Arrays.copyOf(curr, curr.length + other.length);

        int last = curr.length;
outer:
        for (int i = 0; i < other.length; i++) {
          IRubyObject n = other[i];

          for (int j = 0; j < curr.length; j++) {
            if (curr[j] == n) {
              continue outer;
            }
          }

          result[last++] = n;
        }

        XmlNodeSet newSet = newXmlNodeSet(context, Arrays.copyOf(result, last));
        newSet.setReference(this);
        return newSet;
    }

    @JRubyMethod(name = {"push", "<<"})
    public IRubyObject push(ThreadContext context, IRubyObject node_or_namespace) {
        nodes = Arrays.copyOf(nodes, nodes.length+1);
        nodes[nodes.length-1] = node_or_namespace;
        return this;
    }

    //  replace with
    //  https://github.com/jruby/jruby/blame/13a3ec76d883a162b9d46c374c6e9eeea27b3261/core/src/main/java/org/jruby/RubyRange.java#L974
    //  once we upgraded the min JRuby version to >= 9.2
    private static IRubyObject rangeBeginLength(ThreadContext context, IRubyObject rangeMaybe, int len, int[] begLen) {
        RubyRange range = (RubyRange) rangeMaybe;
        int min = range.begin(context).convertToInteger().getIntValue();
        int max = range.end(context).convertToInteger().getIntValue();

        if (min < 0) {
          min += len;
          if (min < 0) {
            throw context.runtime.newRangeError(min + ".." + (range.isExcludeEnd() ? "." : "") + max + " out of range");
          }
        }

        if (max < 0) {
          max += len;
        }

        if (!range.isExcludeEnd()) {
          max++;
        }

        begLen[0] = min;
        begLen[1] = max;
        return context.tru;
    }


    @JRubyMethod(name={"[]", "slice"})
    public IRubyObject slice(ThreadContext context, IRubyObject indexOrRange) {
        if (indexOrRange instanceof RubyFixnum) {
          int idx = ((RubyFixnum)indexOrRange).getIntValue();

          if (idx < 0) {
            idx += nodes.length;
          }

          if (idx >= nodes.length || idx < 0) {
            return context.nil;
          }

          return nodes[idx];
        }

        int[] begLen = new int[2];
        rangeBeginLength(context, indexOrRange, nodes.length, begLen);
        int min = begLen[0];
        int max = begLen[1];
        return subseq(context, min, max - min);
    }

    @JRubyMethod(name={"[]", "slice"})
    public IRubyObject slice(ThreadContext context, IRubyObject start, IRubyObject length) {
        int s = ((RubyFixnum) start).getIntValue();
        int l = ((RubyFixnum) length).getIntValue();

        if (s < 0) {
          s += nodes.length;
        }

        return subseq(context, s, l);
    }

    public IRubyObject subseq(ThreadContext context, int start, int length) {
        if (start > nodes.length) {
          return context.nil;
        }

        if (start < 0 || length < 0) {
          return context.nil;
        }

        if (start + length > nodes.length) {
          length = nodes.length - start;
        }

        int to = start + length;

        IRubyObject[] newNodes = Arrays.copyOfRange(nodes, start, to);

        return newXmlNodeSet(context, newNodes);
    }

    @JRubyMethod(name = {"to_a", "to_ary"})
    public IRubyObject to_a(ThreadContext context) {
        return context.runtime.newArrayNoCopy(nodes);
    }

    @JRubyMethod(name = {"unlink", "remove"})
    public IRubyObject unlink(ThreadContext context) {
        for (int i = 0; i < nodes.length; i++) {
            if (nodes[i] instanceof XmlNode) {
                ((XmlNode) nodes[i] ).unlink(context);
            }
        }
        return this;
    }

    private static XmlNodeSet newXmlNodeSet(ThreadContext context, XmlNodeSet reference) {
        XmlNodeSet xmlNodeSet = create(context.getRuntime());
        xmlNodeSet.setReference(reference);
        xmlNodeSet.nodes = new IRubyObject[0];
        return xmlNodeSet;
    }

    private static IRubyObject asXmlNodeOrNamespace(ThreadContext context, IRubyObject possibleNode) {
        if (possibleNode instanceof XmlNode || possibleNode instanceof XmlNamespace) {
            return possibleNode;
        }
        throw context.getRuntime().newArgumentError("node must be a Nokogiri::XML::Node or Nokogiri::XML::Namespace");
    }

    static IRubyObject[] getNodes(ThreadContext context, IRubyObject possibleNodeSet) {
        if (possibleNodeSet instanceof XmlNodeSet) {
            return ((XmlNodeSet) possibleNodeSet).nodes;
        }
        throw context.getRuntime().newArgumentError("node must be a Nokogiri::XML::NodeSet");
    }

    public int getLength() {
        return nodes.length;
    }

    public Node item(int index) {
        Object n = nodes[index];
        if (n instanceof XmlNode) return ((XmlNode)n).node;
        if (n instanceof XmlNamespace) return ((XmlNamespace)n).getNode();
        return null;
    }
}
