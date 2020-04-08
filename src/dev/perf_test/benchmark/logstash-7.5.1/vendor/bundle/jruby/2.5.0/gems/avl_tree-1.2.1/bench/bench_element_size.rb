require 'benchmark'
require 'radix_tree' # gem install radix_tree
require 'avl_tree'
require 'openssl'

times = 100000
key_size = 10

def aset(h, keys)
  keys.each do |k|
    h[k] = 1
  end
end

def aref(h, keys)
  keys.each do |k|
    h[k]
  end
end

def delete(h, keys)
  keys.each do |k|
    h.delete(k)
  end
end

def run(bm, h, keys)
  name = h.class.name
  bm.report("#{name} aset (#{keys.size})") do
    aset(h, keys)
  end
  bm.report("#{name} aref (#{keys.size})") do
    aref(h, keys)
  end
  bm.report("#{name} delete (#{keys.size})") do
    delete(h, keys)
  end
end

keys = []
1000000.times do
  keys << OpenSSL::Random.random_bytes(key_size)
end

1.upto(100) do |idx|
  elements = idx * 10000

  Benchmark.bm(30) do |bm|
    #run(bm, Hash.new, keys[0, elements])
    #run(bm, RadixTree.new, keys)
    run(bm, AVLTree.new, keys[0, elements])
  end
end
