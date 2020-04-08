package nokogiri.internals;

@SuppressWarnings("serial")
public class ClosedStreamException extends Exception {

  public ClosedStreamException(String message) {
    super(message);
  }

}
