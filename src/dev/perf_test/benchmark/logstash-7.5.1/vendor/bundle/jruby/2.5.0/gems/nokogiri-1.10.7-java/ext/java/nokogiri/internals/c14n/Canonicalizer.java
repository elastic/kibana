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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.w3c.dom.Node;

/**
 *
 * @author Christian Geuer-Pollmann
 */
public class Canonicalizer {

    /** The output encoding of canonicalized data */
    public static final String ENCODING = "UTF8";

    /**
     * XPath Expression for selecting every node and continuous comments joined
     * in only one node
     */
    public static final String XPATH_C14N_WITH_COMMENTS_SINGLE_NODE =
        "(.//. | .//@* | .//namespace::*)";

    /**
     * The URL defined in XML-SEC Rec for inclusive c14n <b>without</b> comments.
     */
    public static final String ALGO_ID_C14N_OMIT_COMMENTS =
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
    /**
     * The URL defined in XML-SEC Rec for inclusive c14n <b>with</b> comments.
     */
    public static final String ALGO_ID_C14N_WITH_COMMENTS =
        ALGO_ID_C14N_OMIT_COMMENTS + "#WithComments";
    /**
     * The URL defined in XML-SEC Rec for exclusive c14n <b>without</b> comments.
     */
    public static final String ALGO_ID_C14N_EXCL_OMIT_COMMENTS =
        "http://www.w3.org/2001/10/xml-exc-c14n#";
    /**
     * The URL defined in XML-SEC Rec for exclusive c14n <b>with</b> comments.
     */
    public static final String ALGO_ID_C14N_EXCL_WITH_COMMENTS =
        ALGO_ID_C14N_EXCL_OMIT_COMMENTS + "WithComments";
    /**
     * The URI for inclusive c14n 1.1 <b>without</b> comments.
     */
    public static final String ALGO_ID_C14N11_OMIT_COMMENTS =
        "http://www.w3.org/2006/12/xml-c14n11";
    /**
     * The URI for inclusive c14n 1.1 <b>with</b> comments.
     */
    public static final String ALGO_ID_C14N11_WITH_COMMENTS =
        ALGO_ID_C14N11_OMIT_COMMENTS + "#WithComments";
    /**
     * Non-standard algorithm to serialize the physical representation for XML Encryption
     */
    public static final String ALGO_ID_C14N_PHYSICAL =
        "http://santuario.apache.org/c14n/physical";

    private static Map<String, Class<? extends CanonicalizerSpi>> canonicalizerHash = null;

    private final CanonicalizerSpi canonicalizerSpi;

    /**
     * Constructor Canonicalizer
     *
     * @param algorithmURI
     * @throws InvalidCanonicalizerException
     */
    private Canonicalizer(String algorithmURI) throws CanonicalizationException {
        try {
            Class<? extends CanonicalizerSpi> implementingClass =
                canonicalizerHash.get(algorithmURI);

            canonicalizerSpi = implementingClass.newInstance();
            canonicalizerSpi.reset = true;
        } catch (Exception e) {
            Object exArgs[] = { algorithmURI };
            throw new CanonicalizationException(
                "signature.Canonicalizer.UnknownCanonicalizer", exArgs, e
            );
        }
    }

    /**
     * Method getInstance
     *
     * @param algorithmURI
     * @return a Canonicalizer instance ready for the job
     * @throws InvalidCanonicalizerException
     */
    public static final Canonicalizer getInstance(String algorithmURI)
        throws CanonicalizationException {
        if (canonicalizerHash == null) {
            canonicalizerHash = new ConcurrentHashMap<String, Class<? extends CanonicalizerSpi>>();
            Canonicalizer.registerDefaultAlgorithms();
        }
        return new Canonicalizer(algorithmURI);
    }

    /**
     * Method register
     *
     * @param algorithmURI
     * @param implementingClass
     * @throws CanonicalizationException
     */
    @SuppressWarnings("unchecked")
    public static void register(String algorithmURI, String implementingClass)
        throws CanonicalizationException, ClassNotFoundException {
        // check whether URI is already registered
        Class<? extends CanonicalizerSpi> registeredClass =
            canonicalizerHash.get(algorithmURI);

        if (registeredClass != null)  {
            Object exArgs[] = { algorithmURI, registeredClass };
            throw new CanonicalizationException("algorithm.alreadyRegistered", exArgs);
        }

        canonicalizerHash.put(
            algorithmURI, (Class<? extends CanonicalizerSpi>)Class.forName(implementingClass)
        );
    }

    /**
     * Method register
     *
     * @param algorithmURI
     * @param implementingClass
     * @throws CanonicalizationException
     */
    public static void register(String algorithmURI, Class<? extends CanonicalizerSpi> implementingClass)
        throws CanonicalizationException {
        // check whether URI is already registered
        Class<? extends CanonicalizerSpi> registeredClass = canonicalizerHash.get(algorithmURI);

        if (registeredClass != null)  {
            Object exArgs[] = { algorithmURI, registeredClass };
            throw new CanonicalizationException("algorithm.alreadyRegistered", exArgs);
        }

        canonicalizerHash.put(algorithmURI, implementingClass);
    }

    /**
     * This method registers the default algorithms.
     */
    private static void registerDefaultAlgorithms() {
        canonicalizerHash.put(Canonicalizer.ALGO_ID_C14N_OMIT_COMMENTS,
                Canonicalizer20010315OmitComments.class);
        canonicalizerHash.put(Canonicalizer.ALGO_ID_C14N_WITH_COMMENTS,
                Canonicalizer20010315WithComments.class);
        canonicalizerHash.put(Canonicalizer.ALGO_ID_C14N_EXCL_OMIT_COMMENTS,
                Canonicalizer20010315ExclOmitComments.class);
        canonicalizerHash.put(Canonicalizer.ALGO_ID_C14N_EXCL_WITH_COMMENTS,
                Canonicalizer20010315ExclWithComments.class);
        canonicalizerHash.put(Canonicalizer.ALGO_ID_C14N11_OMIT_COMMENTS,
                Canonicalizer11_OmitComments.class);
        canonicalizerHash.put(Canonicalizer.ALGO_ID_C14N11_WITH_COMMENTS,
                Canonicalizer11_WithComments.class);
        canonicalizerHash.put(Canonicalizer.ALGO_ID_C14N_PHYSICAL,
                CanonicalizerPhysical.class);
    }

    /**
     * Method getURI
     *
     * @return the URI defined for this c14n instance.
     */
    public final String getURI() {
        return canonicalizerSpi.engineGetURI();
    }

    /**
     * Method getIncludeComments
     *
     * @return true if the c14n respect the comments.
     */
    public boolean getIncludeComments() {
        return canonicalizerSpi.engineGetIncludeComments();
    }

    /**
     * Canonicalizes the subtree rooted by <CODE>node</CODE>.
     *
     * @param node The node to canonicalize
     * @return the result of the c14n.
     *
     * @throws CanonicalizationException
     */
    public byte[] canonicalizeSubtree(Node node, CanonicalFilter filter) throws CanonicalizationException {
        return canonicalizerSpi.engineCanonicalizeSubTree(node, filter);
    }

    /**
     * Canonicalizes the subtree rooted by <CODE>node</CODE>.
     *
     * @param node
     * @param inclusiveNamespaces
     * @return the result of the c14n.
     * @throws CanonicalizationException
     */
    public byte[] canonicalizeSubtree(Node node, String inclusiveNamespaces, CanonicalFilter filter)
        throws CanonicalizationException {
        return canonicalizerSpi.engineCanonicalizeSubTree(node, inclusiveNamespaces, filter);
    }

    /**
     * Sets the writer where the canonicalization ends.  ByteArrayOutputStream
     * if none is set.
     * @param os
     */
    public void setWriter(OutputStream os) {
        canonicalizerSpi.setWriter(os);
    }

    /**
     * Returns the name of the implementing {@link CanonicalizerSpi} class
     *
     * @return the name of the implementing {@link CanonicalizerSpi} class
     */
    public String getImplementingCanonicalizerClass() {
        return canonicalizerSpi.getClass().getName();
    }

    /**
     * Set the canonicalizer behaviour to not reset.
     */
    public void notReset() {
        canonicalizerSpi.reset = false;
    }

}
