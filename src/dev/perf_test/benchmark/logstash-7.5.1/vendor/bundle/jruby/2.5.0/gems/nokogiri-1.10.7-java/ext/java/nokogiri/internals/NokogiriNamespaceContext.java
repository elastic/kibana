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

package nokogiri.internals;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import javax.xml.XMLConstants;
import javax.xml.namespace.NamespaceContext;

/**
 * Holder of each node's namespace.
 * 
 * @author Yoko Harada <yokolet@gmail.com>
 *
 */
public final class NokogiriNamespaceContext implements NamespaceContext {

	public static final String NOKOGIRI_PREFIX = "nokogiri";
    public static final String NOKOGIRI_URI = "http://www.nokogiri.org/default_ns/ruby/extensions_functions";
    public static final String NOKOGIRI_TEMPORARY_ROOT_TAG = "nokogiri-temporary-root-tag";
    
    private final Map<String,String> register;

    public static NokogiriNamespaceContext create() {
        return new NokogiriNamespaceContext();
    }
    
    private NokogiriNamespaceContext() {
        register = new HashMap<String, String>(6, 1);
        register.put(NOKOGIRI_PREFIX, NOKOGIRI_URI);
        register.put("xml", "http://www.w3.org/XML/1998/namespace");
        register.put("xhtml", "http://www.w3.org/1999/xhtml");
    }

    public String getNamespaceURI(String prefix) {
    	if (prefix == null) {
            throw new IllegalArgumentException();
        }
        String uri = this.register.get(prefix);
        if (uri != null) {
            return uri;
        }

        if (prefix.equals(XMLConstants.XMLNS_ATTRIBUTE)) {
            uri = this.register.get(XMLConstants.XMLNS_ATTRIBUTE);
            return (uri == null) ? XMLConstants.XMLNS_ATTRIBUTE_NS_URI : uri;
        }

        return XMLConstants.NULL_NS_URI;
    }

    public String getPrefix(String uri) {
    	if (uri == null) {
            throw new IllegalArgumentException("uri is null");
        }
        Set<Entry<String, String>> entries = register.entrySet();
        for (Entry<String, String> entry : entries) {
            if (uri.equals(entry.getValue())) {
                return entry.getKey();
            }
        }
        return null;
    }

    public Iterator<String> getPrefixes(String uri) {
        Set<Entry<String, String>> entries = register.entrySet();
        ArrayList<String> list = new ArrayList<String>(entries.size());
        for (Entry<String, String> entry : entries) {
            if (uri.equals(entry.getValue())) {
                list.add(entry.getKey());
            }
        }
        return list.iterator();
    }
    
    public Set<String> getAllPrefixes() {
        return register.keySet();
    }

    public void registerNamespace(String prefix, String uri) {
        if ("xmlns".equals(prefix)) prefix = "";
        register.put(prefix, uri);
    }

}
