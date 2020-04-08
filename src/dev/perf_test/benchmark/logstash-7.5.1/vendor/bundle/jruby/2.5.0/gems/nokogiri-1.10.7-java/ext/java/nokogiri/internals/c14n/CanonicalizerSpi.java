/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
package nokogiri.internals.c14n;

import java.io.OutputStream;


import org.w3c.dom.Node;

/**
 * Base class which all Canonicalization algorithms extend.
 *
 * @author Christian Geuer-Pollmann
 */
public abstract class CanonicalizerSpi {

    /** Reset the writer after a c14n */
    protected boolean reset = false;

    /**
     * Returns the URI of this engine.
     * @return the URI
     */
    public abstract String engineGetURI();

    /**
     * Returns true if comments are included
     * @return true if comments are included
     */
    public abstract boolean engineGetIncludeComments();

    /**
     * C14n a node tree.
     *
     * @param rootNode
     * @return the c14n bytes
     * @throws CanonicalizationException
     */
    public abstract byte[] engineCanonicalizeSubTree(Node rootNode, CanonicalFilter filter)
        throws CanonicalizationException;

    /**
     * C14n a node tree.
     *
     * @param rootNode
     * @param inclusiveNamespaces
     * @return the c14n bytes
     * @throws CanonicalizationException
     */
    public abstract byte[] engineCanonicalizeSubTree(Node rootNode, String inclusiveNamespaces, CanonicalFilter filter)
        throws CanonicalizationException;

    /**
     * Sets the writer where the canonicalization ends. ByteArrayOutputStream if
     * none is set.
     * @param os
     */
    public abstract void setWriter(OutputStream os);

}
