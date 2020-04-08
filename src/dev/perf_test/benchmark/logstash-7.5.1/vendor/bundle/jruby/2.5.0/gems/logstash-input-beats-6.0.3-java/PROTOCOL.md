# The Lumberjack Protocol

The needs that lead to this protocol are:

* Encryption and Authentication to protect 
* Compression should be used to reduce bandwidth
* Round-trip latency should not damage throughput
* Application-level message acknowledgement

## Implementation Considerations

# Lumberjack Protocol v1

## Behavior

Sequence and ack behavior (including sliding window, etc) is similar to TCP,
but instead of bytes, messages are the base unit.

A writer with a window size of 50 events can send up to 50 unacked events
before blocking. A reader can acknowledge the 'last event' received to
support bulk acknowledgements.

Reliable, ordered byte transport is ensured by using TCP (or TLS on top), and
this protocol aims to provide reliable, application-level, message transport.

## Encryption and Authentication

Currently this is to be handled by TLS.

## Wire Format

### Layering

This entire protocol is built to be layered on top of TCP or TLS.

### Framing

      0                   1                   2                   3
      0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
     +---------------+---------------+-------------------------------+
     |   version(1)  |   frame type  |     payload ...               |
     +---------------------------------------------------------------+
     |   payload continued...                                        |
     +---------------------------------------------------------------+

### 'data' frame type

* SENT FROM WRITER ONLY
* frame type value: ASCII 'D' aka byte value 0x44

data is a map of string:string pairs. This is analogous to a Hash in Ruby, a
JSON map, etc, but only strings are supported at this time.

Payload:

* 32bit unsigned sequence number
* 32bit 'pair' count (how many key/value sequences follow)
* 32bit unsigned key length followed by that many bytes for the key
* 32bit unsigned value length followed by that many bytes for the value
* repeat key/value 'count' times.

Sequence number roll-over: If you receive a sequence number less than the
previous value, this signals that the sequence number has rolled over.

### 'json' frame type

* SENT FROM WRITER ONLY
* frame type value: ASCII 'J' aka byte value 0x4a

data is json encoded.

Payload:
* 32bit unsigned sequence number
* 32bit payload length (length in bytes of embedded json document)
* 'length' bytes of json payload

Sequence number roll-over: If you receive a sequence number less than the
previous value, this signals that the sequence number has rolled over.

### 'ack' frame type

* SENT FROM READER ONLY
* frame type value: ASCII 'A' aka byte value 0x41

Payload:

* 32bit unsigned sequence number.

Bulk acks are supported. If you receive data frames in sequence order
1,2,3,4,5,6, you can send an ack for '6' and the writer will take this to
mean you are acknowledging all data frames before and including '6'.

### 'window size' frame type

* SENT FROM WRITER ONLY
* frame type value: ASCII 'W' aka byte value 0x57

Payload:

* 32bit unsigned window size value in units of whole data frames.

This frame is used to tell the reader the maximum number of unacknowledged
data frames the writer will send before blocking for acks.

### 'compressed' frame type

* SENT FROM WRITER ONLY
* frame type value: ASCII 'C' aka byte value 0x43

Payload:

* 32bit unsigned payload length 
* 'length' bytes of compressed payload

This frame type allows you to compress many frames into a single compressed
envelope and is useful for efficiently compressing many small data frames.

The compressed payload MUST contain full frames only, not partial frames.
The uncompressed payload MUST be a valid frame stream by itself. As an example,
you could have 3 data frames compressed into a single 'compressed' frame type:
1D{k,v}{k,v}1D{k,v}{k,v}1D{k,v}{k,v} - when uncompressed, you should process
the uncompressed payload as you would reading uncompressed frames from the
network.

TODO(sissel): It's likely this model is suboptimal, instead choose to
use whole-stream compression z_stream in zlib (Zlib::ZStream in ruby) might be
preferable.
