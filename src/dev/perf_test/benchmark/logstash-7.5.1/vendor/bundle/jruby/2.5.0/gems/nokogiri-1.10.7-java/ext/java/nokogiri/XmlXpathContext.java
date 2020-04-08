/**
 * (The MIT License)
 *
 * Copyright (c) 2008 - 2014:
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

import java.util.Set;

import javax.xml.transform.TransformerException;

import org.apache.xml.dtm.DTM;
import org.apache.xpath.XPath;
import org.apache.xpath.XPathContext;
import org.apache.xpath.jaxp.JAXPPrefixResolver;
import org.apache.xpath.jaxp.JAXPVariableStack;
import org.apache.xpath.objects.XObject;
import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.RubyObject;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.exceptions.RaiseException;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.jruby.util.SafePropertyAccessor;
import org.w3c.dom.Node;

import nokogiri.internals.NokogiriNamespaceContext;
import nokogiri.internals.NokogiriXPathFunctionResolver;
import nokogiri.internals.NokogiriXPathVariableResolver;

/**
 * Class for Nokogiri::XML::XpathContext
 *
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 * @author John Shahid <jvshahid@gmail.com>
 */
@JRubyClass(name="Nokogiri::XML::XPathContext")
public class XmlXpathContext extends RubyObject {

    static {
        final String DTMManager = "org.apache.xml.dtm.DTMManager";
        if (SafePropertyAccessor.getProperty(DTMManager) == null) {
            try { // use patched "org.apache.xml.dtm.ref.DTMManagerDefault"
                System.setProperty(DTMManager, nokogiri.internals.XalanDTMManagerPatch.class.getName());
            }
            catch (SecurityException ex) { /* no-op - will work although might be slower */ }
        }
    }

    /**
     * user-data key for (cached) {@link XPathContext}
     */
    public static final String XPATH_CONTEXT = "CACHED_XPATH_CONTEXT";

    private XmlNode context;

    public XmlXpathContext(Ruby runtime, RubyClass klass) {
        super(runtime, klass);
    }

    public XmlXpathContext(Ruby runtime, RubyClass klass, XmlNode node) {
        this(runtime, klass);
        initNode(node);
    }

    private void initNode(XmlNode node) {
        context = node;
    }

    @JRubyMethod(name = "new", meta = true)
    public static IRubyObject rbNew(ThreadContext context, IRubyObject klazz, IRubyObject node) {
        try {
            return new XmlXpathContext(context.runtime, (RubyClass) klazz, (XmlNode) node);
        }
        catch (IllegalArgumentException e) {
            throw context.getRuntime().newRuntimeError(e.getMessage());
        }
    }

    @JRubyMethod
    public IRubyObject evaluate(ThreadContext context, IRubyObject expr, IRubyObject handler) {

        String src = expr.convertToString().asJavaString();
        if (!handler.isNil()) {
            if (!isContainsPrefix(src)) {
                StringBuilder replacement = new StringBuilder();
                Set<String> methodNames = handler.getMetaClass().getMethods().keySet();
                final String PREFIX = NokogiriNamespaceContext.NOKOGIRI_PREFIX;
                for (String name : methodNames) {
                    replacement.setLength(0);
                    replacement.ensureCapacity(PREFIX.length() + 1 + name.length());
                    replacement.append(PREFIX).append(':').append(name);
                    src = src.replace(name, replacement); // replace(name, NOKOGIRI_PREFIX + ':' + name)
                }
            }
        }

        return node_set(context, src, handler);
    }

    @JRubyMethod
    public IRubyObject evaluate(ThreadContext context, IRubyObject expr) {
        return this.evaluate(context, expr, context.getRuntime().getNil());
    }

    private final NokogiriNamespaceContext nsContext = NokogiriNamespaceContext.create();

    @JRubyMethod
    public IRubyObject register_ns(IRubyObject prefix, IRubyObject uri) {
        nsContext.registerNamespace(prefix.asJavaString(), uri.asJavaString());
        return this;
    }

    private NokogiriXPathVariableResolver variableResolver; // binds (if any)

    @JRubyMethod
    public IRubyObject register_variable(IRubyObject name, IRubyObject value) {
        NokogiriXPathVariableResolver variableResolver = this.variableResolver;
        if (variableResolver == null) {
            variableResolver = NokogiriXPathVariableResolver.create();
            this.variableResolver = variableResolver;
        }
        variableResolver.registerVariable(name.asJavaString(), value.asJavaString());
        return this;
    }

    private IRubyObject node_set(ThreadContext context, String expr, IRubyObject handler) {
        final NokogiriXPathFunctionResolver fnResolver =
            handler.isNil() ? null : NokogiriXPathFunctionResolver.create(handler);
        try {
            return tryGetNodeSet(context, expr, fnResolver);
        }
        catch (TransformerException ex) {
            throw new RaiseException(XmlSyntaxError.createXMLXPathSyntaxError(context.runtime, expr, ex)); // Nokogiri::XML::XPath::SyntaxError
        }
    }

    private IRubyObject tryGetNodeSet(ThreadContext context, String expr, NokogiriXPathFunctionResolver fnResolver) throws TransformerException {
        final Node contextNode = this.context.node;

        final JAXPPrefixResolver prefixResolver = new JAXPPrefixResolver(nsContext);
        XPath xpathInternal = new XPath(expr, null, prefixResolver, XPath.SELECT);

        // We always need to have a ContextNode with Xalan XPath implementation
        // To allow simple expression evaluation like 1+1 we are setting
        // dummy Document as Context Node
        final XObject xobj;
        if ( contextNode == null )
            xobj = xpathInternal.execute(getXPathContext(fnResolver), DTM.NULL, prefixResolver);
        else
            xobj = xpathInternal.execute(getXPathContext(fnResolver), contextNode, prefixResolver);

        switch (xobj.getType()) {
            case XObject.CLASS_BOOLEAN : return context.getRuntime().newBoolean(xobj.bool());
            case XObject.CLASS_NUMBER :  return context.getRuntime().newFloat(xobj.num());
            case XObject.CLASS_NODESET :
                XmlNodeSet xmlNodeSet = XmlNodeSet.newEmptyNodeSet(context);
                xmlNodeSet.setNodeList(xobj.nodelist());
                xmlNodeSet.initialize(context.getRuntime(), this.context);
                return xmlNodeSet;
            default : return context.getRuntime().newString(xobj.str());
        }
    }

    private XPathContext getXPathContext(final NokogiriXPathFunctionResolver fnResolver) {
        Node doc = context.getNode().getOwnerDocument();
        if (doc == null) doc = context.getNode();

        XPathContext xpathContext = (XPathContext) doc.getUserData(XPATH_CONTEXT);

        if ( xpathContext == null ) {
            xpathContext = newXPathContext(fnResolver);
            if ( variableResolver == null ) {
                // NOTE: only caching without variables - could be improved by more sophisticated caching
                doc.setUserData(XPATH_CONTEXT, xpathContext, null);
            }
        }
        else {
            Object owner = xpathContext.getOwnerObject();
            if ( ( owner == null && fnResolver == null ) ||
                ( owner instanceof JAXPExtensionsProvider && ((JAXPExtensionsProvider) owner).hasSameResolver(fnResolver) ) ) {
                // can be re-used assuming it has the same variable-stack (for now only cached if no variables)
                if ( variableResolver == null ) return xpathContext;
            }
            xpathContext = newXPathContext(fnResolver); // otherwise we can not use the cached xpath-context
        }

        if ( variableResolver != null ) {
            xpathContext.setVarStack(new JAXPVariableStack(variableResolver));
        }

        return xpathContext;
    }

    private static XPathContext newXPathContext(final NokogiriXPathFunctionResolver functionResolver) {
        if ( functionResolver == null ) return new XPathContext(false);
        return new XPathContext(new JAXPExtensionsProvider(functionResolver), false);
    }

    private boolean isContainsPrefix(final String str) {
        final StringBuilder prefix_ = new StringBuilder();
        for ( String prefix : nsContext.getAllPrefixes() ) {
            prefix_.setLength(0);
            prefix_.ensureCapacity(prefix.length() + 1);
            prefix_.append(prefix).append(':');
            if ( str.contains(prefix_) ) { // prefix + ':'
                return true;
            }
        }
        return false;
    }

    private static final class JAXPExtensionsProvider extends org.apache.xpath.jaxp.JAXPExtensionsProvider {

        final NokogiriXPathFunctionResolver resolver;

        JAXPExtensionsProvider(NokogiriXPathFunctionResolver resolver) {
            super(resolver, false);
            this.resolver = resolver;
        }

        //@Override
        //public boolean equals(Object obj) {
        //    if (obj instanceof JAXPExtensionsProvider) {
        //        return hasSameResolver(((JAXPExtensionsProvider) obj).resolver);
        //    }
        //    return false;
        //}

        final boolean hasSameResolver(final NokogiriXPathFunctionResolver resolver) {
            return resolver == this.resolver || resolver != null && (
                resolver.getHandler() == null ? this.resolver.getHandler() == null : (
                    resolver.getHandler() == this.resolver.getHandler()
                    // resolver.getHandler().eql( this.resolver.getHandler() )
                )
            );
        }

    }

}
