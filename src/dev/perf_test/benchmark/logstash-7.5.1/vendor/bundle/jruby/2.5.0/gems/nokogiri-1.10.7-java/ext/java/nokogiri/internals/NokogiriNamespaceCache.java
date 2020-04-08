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

package nokogiri.internals;

import static nokogiri.internals.NokogiriHelpers.isNamespace;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import nokogiri.XmlNamespace;

import org.w3c.dom.Attr;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;

/**
 * Cache of namespages of each node. XmlDocument has one cache of this class.
 * 
 * @author sergio
 * @author Yoko Harada <yokolet@gmail.com>
 */
public class NokogiriNamespaceCache {

    private List<String[]> keys;
    private Map<String[], CacheEntry> cache;  // pair of the index of a given key and entry
    private XmlNamespace defaultNamespace = null;

    public NokogiriNamespaceCache() {
        keys = new ArrayList<String[]>(); // keys are [prefix, href]
        cache = new LinkedHashMap<String[], CacheEntry>();
    }

    public XmlNamespace getDefault() {
        return defaultNamespace;
    }

    private String[] getKey(String prefix, String href) {
        for (String[] key : keys) {
            if (key[0].equals(prefix) && key[1].equals(href)) return key;
        }
        return null;
    }

    public XmlNamespace get(String prefix, String href) {
        // prefix should not be null.
        // In case of a default namespace, an empty string should be given to prefix argument.
        if (prefix == null || href == null) return null;
        String[] key = getKey(prefix, href);
        if (key != null) {
            return cache.get(key).namespace;
        }
        return null;
    }

    public XmlNamespace get(Node node, String prefix) {
        if (prefix == null) return defaultNamespace;
        for (String[] key : keys) {
            if (key[0].equals(prefix) && cache.get(key) != null && cache.get(key).isOwner(node)) {
                return cache.get(key).namespace;
            }
        }
        return null;
    }

    public List<XmlNamespace> get(String prefix) {
        List<XmlNamespace> namespaces = new ArrayList<XmlNamespace>();
        if (prefix == null) {
            namespaces.add(defaultNamespace);
            return namespaces;
        }
        for (String[] key : keys) {
            if (key[0].equals(prefix) && cache.get(key) != null) {
                namespaces.add(cache.get(key).namespace);
            }
        }
        return namespaces;
    }

    public List<XmlNamespace> get(Node node) {
        List<XmlNamespace> namespaces = new ArrayList<XmlNamespace>();
        for (String[] key : keys) {
            CacheEntry entry = cache.get(key);
            if (entry.isOwner(node)) {
                namespaces.add(entry.namespace);
            }
        }
        return namespaces;
    }

    public void put(XmlNamespace namespace, Node ownerNode) {
        // prefix should not be null.
        // In case of a default namespace, an empty string should be given to prefix argument.
        String prefixString = namespace.getPrefix();
        String hrefString = namespace.getHref();
        if (getKey(prefixString, hrefString) != null) return;
        String[] key = {prefixString, hrefString};
        keys.add(key);
        CacheEntry entry = new CacheEntry(namespace, ownerNode);
        cache.put(key, entry);
        if ("".equals(prefixString)) defaultNamespace = namespace;
    }

    public void remove(String prefix, String href) {
        String[] key = getKey(prefix, href);
        if (key == null) return;
        keys.remove(key);
        cache.remove(key);
    }

    public void clear() {
        // removes namespace declarations from node
        for (String[] key : cache.keySet()) {
            CacheEntry entry = cache.get(key);
            NamedNodeMap attributes = entry.ownerNode.getAttributes();
            for (int j=0; j<attributes.getLength(); j++) {
                String name = ((Attr)attributes.item(j)).getName();
                if (isNamespace(name)) {
                    attributes.removeNamedItem(name);
                }
            }
        }
        keys.clear();
        cache.clear();
        defaultNamespace = null;
    }

    public void replaceNode(Node oldNode, Node newNode) {
        for (String[] key : keys) {
            CacheEntry entry = cache.get(key);
            if (entry.isOwner(oldNode)) {
                entry.replaceOwner(newNode);
            }
        }
    }

    private class CacheEntry {
        private XmlNamespace namespace;
        private Node ownerNode;

        CacheEntry(XmlNamespace namespace, Node ownerNode) {
            this.namespace = namespace;
            this.ownerNode = ownerNode;
        }

        public Boolean isOwner(Node n) {
            return ownerNode.isSameNode(n);
        }

        public void replaceOwner(Node newNode) {
            this.ownerNode = newNode;
        }
    }
}
