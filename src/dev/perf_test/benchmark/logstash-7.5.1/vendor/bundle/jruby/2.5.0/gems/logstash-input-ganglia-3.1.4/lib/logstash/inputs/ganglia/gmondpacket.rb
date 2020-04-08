# encoding: utf-8
# Inspiration
# https://github.com/fastly/ganglia/blob/master/lib/gm_protocol.x
# https://github.com/igrigorik/gmetric/blob/master/lib/gmetric.rb
# https://github.com/ganglia/monitor-core/blob/master/gmond/gmond.c#L1211
# https://github.com/ganglia/ganglia_contrib/blob/master/gmetric-python/gmetric.py#L107
# https://gist.github.com/1377993
# http://rubyforge.org/projects/ruby-xdr/

require 'logstash/inputs/ganglia/xdr'
require 'stringio'

class GmonPacket

  def initialize(packet)
    @xdr=XDR::Reader.new(StringIO.new(packet))

    # Read packet type
    type=@xdr.uint32
    case type
    when 128
      @type=:meta
	when 129
      @type=:ushort
    when 130
      @type=:short
    when 131
      @type=:int
    when 132
      @type=:uint
    when 133
      @type=:string
    when 134
      @type=:float
    when 135
      @type=:double
    when 136
      @type=:meta_request
    else
      @type=:unknown
    end
  end

  def heartbeat?
    @type == :hearbeat
  end

  def data?
    [:ushort, :short, :int, :uint, :string, :float, :double].include? @type
  end

  def meta?
    @type == :meta
  end

  # Parsing a metadata packet : type 128
  def parse_metadata
    meta=Hash.new
    meta['hostname']=@xdr.string
    meta['name']=@xdr.string
    meta['spoof']=@xdr.uint32
    meta['type']=@xdr.string
    meta['name2']=@xdr.string
    meta['units']=@xdr.string
    slope=@xdr.uint32

    case slope
    when 0
      meta['slope']= 'zero'
    when 1
      meta['slope']= 'positive'
    when 2
      meta['slope']= 'negative'
    when 3
      meta['slope']= 'both'
    when 4
      meta['slope']= 'unspecified'
    end

    meta['tmax']=@xdr.uint32
    meta['dmax']=@xdr.uint32
    nrelements=@xdr.uint32
    meta['nrelements']=nrelements
    unless nrelements.nil?
      extra={}
      for i in 1..nrelements
        name=@xdr.string
        extra[name]=@xdr.string
      end
      meta['extra']=extra
    end
    return meta
  end

  # Parsing a data packet : type 133..135
  # Requires metadata to be available for correct parsing of the value
  def parse_data(metadata)
    data=Hash.new
    data['hostname']=@xdr.string

    metricname=@xdr.string
    data['name']=metricname

    data['spoof']=@xdr.uint32
    data['format']=@xdr.string

    data['val']=parse_value(@type)

    # If we received a packet, last update was 0 time ago
    data['tn']=0
    return data
  end

  # Parsing a specific value of type
  # https://github.com/ganglia/monitor-core/blob/master/gmond/gmond.c#L1527
  def parse_value(type)
    value=:unknown
    case type
    when :short
      value=@xdr.int16
    when :ushort
      value=@xdr.uint16
    when :int
      value=@xdr.int32
    when :uint
      value=@xdr.uint32
    when :float
      value=@xdr.float32
    when :double
      value=@xdr.float64
    when :string
      value=@xdr.string
    else
      #puts "Received unknown type #{type}"
    end
    return value
  end

end
