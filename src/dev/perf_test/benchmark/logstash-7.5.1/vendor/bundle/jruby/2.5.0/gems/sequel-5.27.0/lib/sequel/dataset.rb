# frozen-string-literal: true

module Sequel
  # A dataset represents an SQL query. Datasets
  # can be used to select, insert, update and delete records.
  # 
  # Query results are always retrieved on demand, so a dataset can be kept
  # around and reused indefinitely (datasets never cache results):
  #
  #   my_posts = DB[:posts].where(author: 'david') # no records are retrieved
  #   my_posts.all # records are retrieved
  #   my_posts.all # records are retrieved again
  #
  # Datasets are frozen and use a functional style where modification methods
  # return modified copies of the the dataset.  This allows you to reuse
  # datasets:
  #
  #   posts = DB[:posts]
  #   davids_posts = posts.where(author: 'david')
  #   old_posts = posts.where{stamp < Date.today - 7}
  #   davids_old_posts = davids_posts.where{stamp < Date.today - 7}
  #
  # Datasets are Enumerable objects, so they can be manipulated using many
  # of the Enumerable methods, such as +map+ and +inject+.  Note that there are some methods
  # that Dataset defines that override methods defined in Enumerable and result in different
  # behavior, such as +select+ and +group_by+.
  #
  # For more information, see the {"Dataset Basics" guide}[rdoc-ref:doc/dataset_basics.rdoc].
  class Dataset
    OPTS = Sequel::OPTS

    # Whether Dataset#freeze can actually freeze datasets.  True only on ruby 2.4+,
    # as it requires clone(freeze: false)
    TRUE_FREEZE = RUBY_VERSION >= '2.4'

    include Enumerable
    include SQL::AliasMethods
    include SQL::BooleanMethods
    include SQL::CastMethods
    include SQL::ComplexExpressionMethods
    include SQL::InequalityMethods
    include SQL::NumericMethods
    include SQL::OrderMethods
    include SQL::StringMethods
  end
  
  require_relative "dataset/query"
  require_relative "dataset/actions"
  require_relative "dataset/features"
  require_relative "dataset/graph"
  require_relative "dataset/prepared_statements"
  require_relative "dataset/misc"
  require_relative "dataset/sql"
  require_relative "dataset/placeholder_literalizer"
  require_relative "dataset/dataset_module"
end
