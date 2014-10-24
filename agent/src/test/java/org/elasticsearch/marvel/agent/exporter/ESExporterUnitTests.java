/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */


package org.elasticsearch.marvel.agent.exporter;

import org.elasticsearch.common.io.Streams;
import org.elasticsearch.test.ElasticsearchTestCase;
import org.hamcrest.MatcherAssert;
import org.hamcrest.Matchers;
import org.junit.Test;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URISyntaxException;
import java.net.URL;

import static org.hamcrest.CoreMatchers.equalTo;


public class ESExporterUnitTests extends ElasticsearchTestCase {

    @Test
    public void testVersionIsExtractableFromIndexTemplate() throws IOException {
        byte[] template;
        InputStream is = ESExporter.class.getResourceAsStream("/marvel_index_template.json");
        if (is == null) {
            throw new FileNotFoundException("Resource [/marvel_index_template.json] not found in classpath");
        }
        template = Streams.copyToByteArray(is);
        is.close();
        MatcherAssert.assertThat(ESExporter.parseIndexVersionFromTemplate(template), Matchers.greaterThan(0));
    }

    @Test
    public void testHostParsing() throws MalformedURLException, URISyntaxException {
        URL url = ESExporter.parseHostWithPath("localhost:9200", "");
        verifyUrl(url, "http", "localhost", 9200, "/");

        url = ESExporter.parseHostWithPath("localhost", "_bulk");
        verifyUrl(url, "http", "localhost", 9200, "/_bulk");

        url = ESExporter.parseHostWithPath("http://localhost:9200", "_bulk");
        verifyUrl(url, "http", "localhost", 9200, "/_bulk");

        url = ESExporter.parseHostWithPath("http://localhost", "_bulk");
        verifyUrl(url, "http", "localhost", 9200, "/_bulk");

        url = ESExporter.parseHostWithPath("https://localhost:9200", "_bulk");
        verifyUrl(url, "https", "localhost", 9200, "/_bulk");

        url = ESExporter.parseHostWithPath("https://boaz-air.local:9200", "_bulk");
        verifyUrl(url, "https", "boaz-air.local", 9200, "/_bulk");

        url = ESExporter.parseHostWithPath("boaz:test@localhost:9200", "");
        verifyUrl(url, "http", "localhost", 9200, "/", "boaz:test");

        url = ESExporter.parseHostWithPath("boaz:test@localhost", "_bulk");
        verifyUrl(url, "http", "localhost", 9200, "/_bulk", "boaz:test");

        url = ESExporter.parseHostWithPath("http://boaz:test@localhost:9200", "_bulk");
        verifyUrl(url, "http", "localhost", 9200, "/_bulk", "boaz:test");

        url = ESExporter.parseHostWithPath("http://boaz:test@localhost", "_bulk");
        verifyUrl(url, "http", "localhost", 9200, "/_bulk", "boaz:test");

        url = ESExporter.parseHostWithPath("https://boaz:test@localhost:9200", "_bulk");
        verifyUrl(url, "https", "localhost", 9200, "/_bulk", "boaz:test");

        url = ESExporter.parseHostWithPath("boaz:test@localhost:9200/suburl", "");
        verifyUrl(url, "http", "localhost", 9200, "/suburl/", "boaz:test");

        url = ESExporter.parseHostWithPath("boaz:test@localhost:9200/suburl/", "");
        verifyUrl(url, "http", "localhost", 9200, "/suburl/", "boaz:test");

        url = ESExporter.parseHostWithPath("localhost/suburl", "_bulk");
        verifyUrl(url, "http", "localhost", 9200, "/suburl/_bulk");

        url = ESExporter.parseHostWithPath("http://boaz:test@localhost:9200/suburl/suburl1", "_bulk");
        verifyUrl(url, "http", "localhost", 9200, "/suburl/suburl1/_bulk", "boaz:test");

        url = ESExporter.parseHostWithPath("http://boaz:test@localhost/suburl", "_bulk");
        verifyUrl(url, "http", "localhost", 9200, "/suburl/_bulk", "boaz:test");

        url = ESExporter.parseHostWithPath("https://boaz:test@localhost:9200/suburl", "_bulk");
        verifyUrl(url, "https", "localhost", 9200, "/suburl/_bulk", "boaz:test");
    }

    void verifyUrl(URL url, String protocol, String host, int port, String path) {
        assertThat(url.getProtocol(), equalTo(protocol));
        assertThat(url.getHost(), equalTo(host));
        assertThat(url.getPort(), equalTo(port));
        assertThat(url.getPath(), equalTo(path));
    }

    void verifyUrl(URL url, String protocol, String host, int port, String path, String userInfo) {
        verifyUrl(url, protocol, host, port, path);
        assertThat(url.getUserInfo(), equalTo(userInfo));

    }
}
