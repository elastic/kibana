require 'benchmark'
require 'avl_tree'
require 'red_black_tree'
require 'openssl'

#random = Random.new(0)

TIMES = 100000
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
  bm.report("#{name} aset") do
    aset(h, keys)
  end
  bm.report("#{name} aref") do
    aref(h, keys)
  end
  bm.report("#{name} delete") do
    delete(h, keys)
  end
end

keys = []
TIMES.times do
  keys << OpenSSL::Random.random_bytes(key_size)
end

Benchmark.bmbm do |bm|
  run(bm, Hash.new, keys)
  run(bm, AVLTree.new, keys)
  run(bm, RedBlackTree.new, keys)
end
