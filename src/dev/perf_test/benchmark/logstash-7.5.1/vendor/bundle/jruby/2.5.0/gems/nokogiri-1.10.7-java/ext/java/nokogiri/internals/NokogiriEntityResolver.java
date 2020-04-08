package nokogiri.internals;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.net.URI;

import nokogiri.internals.ParserContext.Options;

import org.jruby.Ruby;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import org.xml.sax.ext.EntityResolver2;

/**
 * An entity resolver aware of the fact that the Ruby runtime can
 * change directory but the JVM cannot.  Thus any file based
 * entity resolution that uses relative paths must be translated
 * to be relative to the current directory of the Ruby runtime.
 */
public class NokogiriEntityResolver implements EntityResolver2 {
    protected final Ruby runtime;
    private final NokogiriErrorHandler handler;
    private final Options options;

    public NokogiriEntityResolver(Ruby runtime, NokogiriErrorHandler handler, Options options) {
        super();
        this.runtime = runtime;
        this.handler = handler;
        this.options = options;
    }

    @Override
    public InputSource getExternalSubset(String name, String baseURI)
        throws SAXException, IOException {
        return null;
    }

    @Override
    public InputSource resolveEntity(String publicId, String systemId)
        throws SAXException, IOException {
        return resolveEntity(runtime, null, publicId, null, systemId);
    }

    @Override
    public InputSource resolveEntity(String name,
                                     String publicId,
                                     String baseURI,
                                     String systemId)
        throws SAXException, IOException {
        return resolveEntity(runtime, name, publicId, baseURI, systemId);
    }

    private static File join(String parent, String child) {
        if (new File(parent).isFile()) {
            parent = new File(parent).getParent();
        }
        return new File(parent, child);
    }

    private static InputSource emptyInputSource(InputSource source) {
        source.setByteStream(new ByteArrayInputStream(new byte[0]));
        return source;
    }

    private boolean shouldLoadDtd() {
      return options.dtdLoad || options.dtdValid;
    }

    private void addError(String errorMessage) {
        if (handler != null) handler.errors.add(new Exception(errorMessage));
    }

    /**
     * Create a file base input source taking into account the current
     * directory of <code>runtime</code>.
     * @throws SAXException
     */
    protected InputSource resolveEntity(Ruby runtime, String name, String publicId, String baseURI, String systemId)
        throws IOException, SAXException {
        InputSource s = new InputSource();
        if (name.equals("[dtd]") && !shouldLoadDtd()) {
          return emptyInputSource(s);
        } else if (!name.equals("[dtd]") && !options.noEnt) {
          return emptyInputSource(s);
        }
        String adjustedSystemId;
        URI uri = URI.create(systemId);
        if (options.noNet && uri.getHost() != null) {
          addError("Attempt to load network entity " + systemId);
          return emptyInputSource(s);
        }
        // if this is a url or absolute file name then use it
        if (uri.isAbsolute() && !uri.isOpaque()) {
          adjustedSystemId = uri.toURL().toString();
        } else if (new File(uri.getPath()).isAbsolute()) {
          adjustedSystemId = uri.getPath();
        } else if (baseURI != null) {
          URI baseuri = URI.create(baseURI);
          if (options.noNet && baseuri.getHost() != null) {
            addError("Attempt to load network entity " + systemId);
            return emptyInputSource(s);
          }
          if (baseuri.getHost() == null) {
            // this is a local file
            adjustedSystemId = join(baseuri.getPath(), uri.getPath()).getCanonicalPath();
          } else {
            // this is a url, then resolve uri using baseuri
            adjustedSystemId = baseuri.resolve(systemId).toURL().toString();
          }
        } else {
          // baseURI is null we have to use the current working directory to resolve the entity
          String pwd = runtime.getCurrentDirectory();
          adjustedSystemId = join(pwd, uri.getPath()).getCanonicalPath();
        }
        s.setSystemId(adjustedSystemId);
        s.setPublicId(publicId);
        return s;
    }

}
