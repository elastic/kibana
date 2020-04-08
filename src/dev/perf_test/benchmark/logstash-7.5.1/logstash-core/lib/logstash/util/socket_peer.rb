# encoding: utf-8
module ::LogStash::Util::SocketPeer
  public
  def peer
    "#{peeraddr[3]}:#{peeraddr[1]}"
  end # def peer
end # module SocketPeer
