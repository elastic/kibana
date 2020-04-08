require 'test_helper'

module ACRONYM
end

class Project
  def self.bo0k
    Bo0k
  end
end

class Book
  class TableOfContents; end

  def tableof_contents
    TableofContents
  end

  class Page
    def tableof_contents
      TableofContents
    end

    def self.tableof_contents
      TableofContents
    end
  end
end

class ClassNameCheckTest < Minitest::Test
  def test_corrections
    error = assert_raises(NameError) { ::Bo0k }
    assert_correction "Book", error.corrections
  end

  def test_corrections_include_case_specific_class_name
    error = assert_raises(NameError) { ::Acronym }
    assert_correction "ACRONYM", error.corrections
  end

  def test_corrections_include_top_level_class_name
    error = assert_raises(NameError) { Project.bo0k }
    assert_correction "Book", error.corrections
  end

  def test_names_in_corrections_have_namespaces
    error = assert_raises(NameError) { ::Book::TableofContents }
    assert_correction "Book::TableOfContents", error.corrections
  end

  def test_corrections_candidates_for_names_in_upper_level_scopes
    error = assert_raises(NameError) { Book::Page.tableof_contents }
    assert_correction "Book::TableOfContents", error.corrections
  end

  def test_corrections_should_work_from_within_instance_method
    error = assert_raises(NameError) { ::Book.new.tableof_contents }
    assert_correction "Book::TableOfContents", error.corrections
  end

  def test_corrections_should_work_from_within_instance_method_on_nested_class
    error = assert_raises(NameError) { ::Book::Page.new.tableof_contents }
    assert_correction "Book::TableOfContents", error.corrections
  end
end
