# encoding: utf-8
require 'java'

java_import org.logstash.tcp.Decoder

class DecoderImpl

  include Decoder

  def initialize(codec, tcp)
    @tcp = tcp
    @codec = codec
    @first_read = true
  end

  def decode(channel_addr, data)
    bytes = Java::byte[data.readableBytes].new
    data.getBytes(0, bytes)
    data.release
    tbuf = String.from_java_bytes bytes, "ASCII-8BIT"
    if @first_read
      tbuf = init_first_read(channel_addr, tbuf)
    end
    @tcp.decode_buffer(@ip_address, @address, @port, @codec,
                       @proxy_address, @proxy_port, tbuf, nil)
  end

  def copy
    DecoderImpl.new(@codec.clone, @tcp)
  end

  def flush
    @tcp.flush_codec(@codec, @ip_address, @address, @port, nil)
  end

  private
  def init_first_read(channel_addr, received)
    if @tcp.proxy_protocol
      pp_hdr, filtered = received.split("\r\n", 2)
      pp_info = pp_hdr.split(/\s/)
      # PROXY proto clientip proxyip clientport proxyport
      if pp_info[0] != "PROXY"
        @tcp.logger.error("invalid proxy protocol header label", :hdr => pp_hdr)
        raise IOError
      else
        @proxy_address = pp_info[3]
        @proxy_port = pp_info[5]
        @address = pp_info[2]
        @port = pp_info[4]
      end
    else
      filtered = received
      @ip_address = channel_addr.get_address.get_host_address
      @address = extract_host_name(channel_addr)
      @port = channel_addr.get_port
    end
    @first_read = false
    filtered
  end

  private
  def extract_host_name(channel_addr)
    return channel_addr.get_host_string unless @tcp.dns_reverse_lookup_enabled?

    channel_addr.get_host_name
  end
end
