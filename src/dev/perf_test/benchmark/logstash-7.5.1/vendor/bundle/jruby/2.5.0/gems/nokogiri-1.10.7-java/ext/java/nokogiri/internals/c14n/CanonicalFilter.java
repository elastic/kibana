package nokogiri.internals.c14n;

import nokogiri.XmlNode;
import nokogiri.internals.NokogiriHelpers;

import org.jruby.runtime.Block;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.w3c.dom.Node;

public class CanonicalFilter {
    private final Block block;
    private final ThreadContext context;

    public CanonicalFilter(ThreadContext context, Block block) {
        this.context = context;
        this.block = block;
    }

    public boolean includeNodes(Node currentNode, Node parentNode) {
        if (block == null || !block.isGiven())
            return true;

        IRubyObject current = NokogiriHelpers.getCachedNodeOrCreate(context.getRuntime(), currentNode);
        IRubyObject parent = NokogiriHelpers.getCachedNodeOrCreate(context.getRuntime(), parentNode);

        if (parent.isNil()) {
            IRubyObject doc = ((XmlNode) current).document(context);
            boolean returnValue = block.call(context, current, doc).isTrue();
            block.call(context, doc, context.nil);
            return returnValue;
        }

        return block.call(context, current, parent).isTrue();
    }

}
