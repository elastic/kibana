package org.elasticsearch.marvel.agent.exporter;

import org.elasticsearch.common.io.Streams;
import org.hamcrest.MatcherAssert;
import org.hamcrest.Matchers;
import org.testng.annotations.Test;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;

public class ESExporterTests {

    @Test
    public void testVersionIsExtractableFromIndexTemplate() throws UnsupportedEncodingException {
        byte[] template;
        try {
            InputStream is = ESExporter.class.getResourceAsStream("/marvel_index_template.json");
            if (is == null) {
                throw new FileNotFoundException("Resource [/marvel_index_template.json] not found in classpath");
            }
            template = Streams.copyToByteArray(is);
            is.close();
        } catch (IOException e) {
            // throwing an exception to stop exporting process - we don't want to send data unless
            // we put in the template for it.
            throw new RuntimeException("failed to load marvel_index_template.json", e);
        }
        MatcherAssert.assertThat(ESExporter.parseIndexVersionFromTemplate(template), Matchers.greaterThan(0));
    }
}
