# AVL tree, Red-black tree in Ruby

avl_tree - AVL tree, Red-black tree and Lock-free Red black tree in Ruby
Copyright (C) 2014 Hiroshi Nakamura <nahi@ruby-lang.org>


## Usage

You can use AVLTree, RedBlackTree or ConcurrentRedBlackTree just as a
replacement of Hash.

    @points = Hash.new
    ...
    @points[score] = person
    ...
    @points.each do |score, person|
      ...
    end

    ->

    require 'avl_tree'
    @points = AVLTree.new

    require 'red_black_tree'
    @points = RedBlackTree.new
    @points = ConcurrentRedBlackTree.new

AVLTree and RedBlackTree are faster but not thread-safe.  Use ConcurrentRedBlackTree in multi-thread environment.

## Author

Name:: Hiroshi Nakamura
E-mail:: nahi@ruby-lang.org
Project web site:: http://github.com/nahi/avl_tree


## License

This program is copyrighted free software by Hiroshi Nakamura.  You can
redistribute it and/or modify it under the same terms of Ruby's license;
either the dual license version in 2003, or any later version.
