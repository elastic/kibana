/**
 *
 */
package nokogiri.internals;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.Future;
import java.util.concurrent.FutureTask;
import java.util.concurrent.LinkedBlockingQueue;

import nokogiri.XmlSaxPushParser;

/**
 * A smart input stream that signals the caller when a chunk of data is consumed
 * from the stream. The main use of this stream is to synchronize the
 * {@link XmlSaxPushParser} and the {@link XmlSaxParser} which runs in a
 * different thread.
 *
 * @author John Shahid <jvshahid@gmail.com>
 */
public class NokogiriBlockingQueueInputStream extends InputStream {
  private final LinkedBlockingQueue<Task>  queue;
  protected Task                           currentTask;
  protected ByteArrayInputStream           currentStream;
  protected int                            position;
  protected boolean                        closed = false;

  public static final ByteArrayInputStream END    = new ByteArrayInputStream(new byte[0]);

  private static class Task extends FutureTask<Void> {
    private final ByteArrayInputStream stream;

    public Task(ByteArrayInputStream stream) {
      super(new Callable<Void>() {
        @Override
        public Void call() throws Exception {
          // TODO Auto-generated method stub
          return null;
        }
      });
      this.stream = stream;
    }

    public ByteArrayInputStream getStream() {
      return stream;
    }

    @Override
    public void run() {
      // don't do anything
    }

    @Override
    public boolean runAndReset() {
      // don't do anything
      return true;
    }

    @Override
    public void set(Void v) {
      super.set(v);
    }
  }

  public NokogiriBlockingQueueInputStream() {
    queue = new LinkedBlockingQueue<Task>();
  }

  /**
   * This method shouldn't be called unless the parser has finished parsing or
   * threw an exception while doing so, otherwise, there'll be the protential
   * that the read method will block indefinitely.
   */
  @Override
  public synchronized void close() {
    closed = true;
    List<Task> tasks = new LinkedList<Task>();
    queue.drainTo(tasks);
    tasks.add(currentTask);
    for (Task task : tasks) {
      task.set(null);
    }
  }

  /**
   * Add @param stream to the end of the queue of data that will be returned by
   * {@link #read()} and its variants. The method will @return a future whose
   * {@link Future#get()} will block until the data in @param stream is read.
   *
   * Passing the special stream {@link #END} to this method, will cause
   * {@link #read()} to return an eof indicator (i.e. -1) to the caller, after
   * all the data inserted before {@link #END} is processed.
   *
   * @return
   */
  public synchronized Future<Void> addChunk(ByteArrayInputStream stream) throws ClosedStreamException {
    if (closed)
      throw new ClosedStreamException("Cannot add a chunk to a closed stream");
    Task task = new Task(stream);
    queue.add(task);
    return task;
  }

  /*
   * (non-Javadoc)
   *
   * @see java.io.InputStream#read()
   */
  @Override
  public int read() throws IOException {
    if (currentTask == null || currentStream.available() == 0)
      if (getNextTask() == -1)
        return -1;
    return currentStream.read();
  }

  /*
   * (non-Javadoc)
   *
   * @see java.io.InputStream#read(byte[], int, int)
   */
  @Override
  public int read(byte[] bytes, int off, int len) {
    if (currentTask == null || currentStream.available() == 0) {
      if (getNextTask() == -1) {
        currentTask.set(null);
        return -1;
      }
    }
    return currentStream.read(bytes, off, len);
  }

  protected int getNextTask() {
    while (true) {
      try {
        if (currentTask != null)
          currentTask.set(null);
        currentTask = queue.take();
        currentStream = currentTask.getStream();
        return currentStream.available() == 0 ? -1 : currentStream.available();
      } catch (InterruptedException ex) {
        // keep retrying to read
      }
    }
  }
}
