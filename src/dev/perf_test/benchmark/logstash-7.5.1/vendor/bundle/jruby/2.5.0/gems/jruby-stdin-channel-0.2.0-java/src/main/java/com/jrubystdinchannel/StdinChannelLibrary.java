package com.jrubystdinchannel;

import java.io.*;
import java.lang.reflect.Field;
import java.nio.ByteBuffer;
import java.nio.channels.ClosedChannelException;
import java.nio.channels.FileChannel;

import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.RubyModule;
import org.jruby.RubyNumeric;
import org.jruby.RubyObject;
import org.jruby.RubyString;
import org.jruby.exceptions.RaiseException;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.runtime.ObjectAllocator;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.jruby.runtime.load.Library;
import org.jruby.javasupport.JavaUtil;

public class StdinChannelLibrary implements Library {
    public void load(Ruby runtime, boolean wrap) throws IOException {
        RubyModule mmapModule = runtime.defineModule("StdinChannel");
        RubyClass byteBufferClass = runtime.defineClassUnder("Reader", runtime.getObject(),  new ObjectAllocator() {
            public IRubyObject allocate(Ruby runtime, RubyClass rubyClass) {
                return new Reader(runtime, rubyClass);
            }
        }, mmapModule);
        byteBufferClass.defineAnnotatedMethods(Reader.class);
    }

    @JRubyClass(name = "Reader", parent = "Object")
    public static class Reader extends RubyObject {

        private FileInputStream in;
        private FileChannel channel;

        public Reader(Ruby runtime, RubyClass klass) {
            super(runtime, klass);
        }

        // def initialize
        @JRubyMethod(name = "initialize")
        public IRubyObject initialize(ThreadContext context)
        {
            this.in = interruptibleStdin(context);
            this.channel = in.getChannel();
            return context.nil;
        }


        private static FileInputStream interruptibleStdin(ThreadContext context)
        {
            final RaiseException EXTRACT_ERROR = context.runtime.newRuntimeError("cannot find underlying FileInputStream in System.in");

            try {
                InputStream stdin = System.in;

                // we expect System.in to be a FilterInputStream, let's setup access to its "in" field
                Field inField = FilterInputStream.class.getDeclaredField("in");
                inField.setAccessible(true);

                // normally the underlying FileInputStream is directly in the "in" field but
                // let's make sure it's not hidden in another inner FilterInputStream
                while (stdin instanceof FilterInputStream) {
                    stdin = (InputStream) inField.get(stdin);
                }

                // no luck discovering inner FileInputStream ?
                if (!(stdin instanceof FileInputStream)) {
                    throw EXTRACT_ERROR;
                }

                return (FileInputStream) stdin;
            } catch (NoSuchFieldException|IllegalAccessException e) {
                throw EXTRACT_ERROR;
            }
        }


        // def read(size)
        @JRubyMethod(name = "read", required = 1)
            public IRubyObject read(ThreadContext context, IRubyObject _size)
                throws IOException
        {
            int size = RubyNumeric.num2int(_size);

            // not sure if we should not reuse a global ByteBuffer here instead of
            // reallocating a new one at each read call
            ByteBuffer data = ByteBuffer.allocate(size);
            int n;

            try {
                n = this.channel.read(data);
            } catch (ClosedChannelException e) {
                throw context.runtime.newRaiseException(getRuntime().getModule("StdinChannel").getClass("ClosedChannelError"), "stdin channel closed");
            } catch (IOException e) {
                throw context.runtime.newIOErrorFromException(e);
            }

            if (n > 0) {
                byte[] bytes = new byte[n];
                // what is the difference with using data.array() ?
                data.position(0);
                data.get(bytes, 0, n);
                return RubyString.newString(context.runtime, bytes);
            } else if (n == 0) {
                // return new empty String
                return new RubyString(context.runtime, context.runtime.getString());
            } else {
                throw context.runtime.newEOFError();
            }
        }

        // @return [FileChannel] retrieve native Java FileChannel
        @JRubyMethod(name = "channel")
        public IRubyObject channel(ThreadContext context)
        {
            return JavaUtil.convertJavaToUsableRubyObject(context.runtime, this.channel);
        }

        @JRubyMethod(name = "close")
        public void close()
                throws IOException
        {
            this.channel.close();
        }
    }
}