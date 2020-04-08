import java.io.IOException;
import org.jruby.Ruby;
import org.jruby.runtime.load.BasicLibraryService;

public class StdinChannelService implements BasicLibraryService {
    public boolean basicLoad(final Ruby runtime) throws IOException {
        new com.jrubystdinchannel.StdinChannelLibrary().load(runtime, false);
        return true;
    }
}
