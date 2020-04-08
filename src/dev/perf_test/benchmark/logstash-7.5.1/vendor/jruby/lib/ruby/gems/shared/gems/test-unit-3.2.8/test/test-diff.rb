class TestUnitDiff < Test::Unit::TestCase
  def test_binary_search_ranges
    assert_found_binary_search_ranges(5, [1..2, 4..5, 7..9])
    assert_not_found_binary_search_ranges(3, [1..2, 4..5, 7..9])
  end

  def test_to_indexes
    assert_to_indexes({"abc def" => [0, 2], "abc" => [1]},
                      ["abc def", "abc", "abc def"])

    assert_to_indexes({?a => [0, 3], ?b => [1], ?c => [2], ?d => [4]},
                      "abcad")

    assert_to_indexes({
                        ?1 => [0, 35],
                        ?t => [2, 5, 16],
                        ?e => [3, 14, 31, 38],
                        ?s => [4, 6, 12, 13, 20, 32, 44],
                        ?, => [7, 21, 33],
                        ?0 => [9, 23],
                        ?a => [11, 26],
                        ?r => [15, 30],
                        ?i => [17, 27, 41],
                        ?o => [18],
                        ?n => [19, 39, 42],
                        ?f => [25],
                        ?l => [28],
                        ?u => [29],
                        ?p => [37],
                        ?d => [40],
                        ?g => [43],
                      },
                      "1 tests, 0 assertions, 0 failures, 1 pendings") do |x|
      x == " "[0]
    end
  end

  def test_longest_match
    assert_longest_match([0, 1, 3],
                         %w(b c d), %w(a b c d x y z),
                         0, 2, 0, 7)
    assert_longest_match([1, 2, 2],
                         %w(b c d), %w(a b c d x y z),
                         1, 2, 0, 6)
    assert_longest_match([0, 0, 0],
                         %w(a b), %w(c),
                         0, 1, 0, 0)
    assert_longest_match([1, 0, 2],
                         %w(q a b x c d), %w(a b y c d f),
                         0, 5, 0, 5)
    assert_longest_match([4, 3, 2],
                         %w(q a b x c d), %w(a b y c d f),
                         3, 5, 2, 5)

    assert_longest_match([1, 0, 2], "qabxcd", "abycdf", 0, 5, 0, 5)
    assert_longest_match([0, 0, 1], "efg", "eg", 0, 2, 0, 1)
    assert_longest_match([2, 1, 1], "efg", "eg", 1, 2, 1, 1)
  end

  def test_longest_match_with_junk_predicate
    assert_longest_match([0, 4, 5], " abcd", "abcd abcd", 0, 4, 0, 8)
    assert_longest_match([1, 0, 4], " abcd", "abcd abcd", 0, 4, 0, 8) do |x|
      x == ' '[0]
    end
  end

  def test_matches
    assert_matches([[0, 0, 2],
                    [3, 2, 2]],
                   %w(a b x c d), %w(a b c d))
    assert_matches([[1, 0, 2],
                    [4, 3, 2]],
                   %w(q a b x c d), %w(a b y c d f))

    assert_matches([[1, 0, 2],
                    [4, 3, 2]],
                   "qabxcd", "abycdf")
    assert_matches([[0, 0, 1],
                    [2, 1, 1]],
                   "efg", "eg")
  end

  def test_matches_with_junk_predicate
    assert_matches([[0, 0, 23],
                    [24, 24, 11],
                    [36, 36, 9]],
                  "1 tests, 0 assertions, 1 failures, 0 pendings",
                  "1 tests, 0 assertions, 0 failures, 1 pendings")

    assert_matches([[0, 0, 1],
                    [1, 1, 8],
                    [9, 9, 1],
                    [10, 10, 13],
                    [24, 24, 11],
                    [36, 36, 9]],
                  "1 tests, 0 assertions, 1 failures, 0 pendings",
                  "1 tests, 0 assertions, 0 failures, 1 pendings") do |x|
      x == " "[0]
    end
  end

  def test_blocks
    assert_blocks([[0, 0, 2],
                   [3, 2, 2],
                   [5, 4, 0]],
                  %w(a b x c d), %w(a b c d))
    assert_blocks([[1, 0, 2],
                   [4, 3, 2],
                   [6, 6, 0]],
                  %w(q a b x c d), %w(a b y c d f))

    assert_blocks([[1, 0, 2],
                   [4, 3, 2],
                   [6, 6, 0]],
                  "qabxcd", "abycdf")
    assert_blocks([[0, 0, 1],
                   [2, 1, 1],
                   [3, 2, 0]],
                  "efg", "eg")
  end

  def test_blocks_with_junk_predicate
    assert_blocks([[0, 0, 23],
                   [24, 24, 11],
                   [36, 36, 9],
                   [45, 45, 0]],
                  "1 tests, 0 assertions, 1 failures, 0 pendings",
                  "1 tests, 0 assertions, 0 failures, 1 pendings") do |x|
      x == " "[0]
    end
  end

  def test_operations
    assert_operations([], %w(), %w())

    assert_operations([[:delete, 0, 1, 0, 0],
                       [:equal, 1, 3, 0, 2],
                       [:replace, 3, 4, 2, 3],
                       [:equal, 4, 6, 3, 5],
                       [:insert, 6, 6, 5, 6]],
                      %w(q a b x c d), %w(a b y c d f))

    assert_operations([[:delete, 0, 1, 0, 0],
                       [:equal, 1, 3, 0, 2],
                       [:replace, 3, 4, 2, 3],
                       [:equal, 4, 6, 3, 5],
                       [:insert, 6, 6, 5, 6]],
                      "qabxcd", "abycdf")

    assert_operations([[:equal, 0, 23, 0, 23],
                       [:replace, 23, 24, 23, 24],
                       [:equal, 24, 35, 24, 35],
                       [:replace, 35, 36, 35, 36],
                       [:equal, 36, 45, 36, 45]],
                      "1 tests, 0 assertions, 1 failures, 0 pendings",
                      "1 tests, 0 assertions, 0 failures, 1 pendings")

    assert_operations([[:equal, 0, 23, 0, 23],
                       [:replace, 23, 24, 23, 24],
                       [:equal, 24, 35, 24, 35],
                       [:replace, 35, 36, 35, 36],
                       [:equal, 36, 45, 36, 45]],
                      "1 tests, 0 assertions, 1 failures, 0 pendings",
                      "1 tests, 0 assertions, 0 failures, 1 pendings") do |x|
      x == " "[0]
    end
  end

  def test_grouped_operations
    assert_grouped_operations([[[:equal, 0, 0, 0, 0]]],
                              %w(),
                              %w())

    assert_grouped_operations([[[:equal, 0, 3, 0, 3]]],
                              %w(a b c),
                              %w(a b c))

    assert_grouped_operations([[[:equal, 0, 1, 0, 1],
                                [:replace, 1, 2, 1, 2],
                                [:equal, 2, 5, 2, 5]],
                               [[:equal, 8, 11, 8, 11],
                                [:replace, 11, 12, 11, 12],
                                [:equal, 12, 13, 12, 13],
                                [:delete, 13, 16, 13, 13],
                                [:equal, 16, 17, 13, 14],
                                [:replace, 17, 18, 14, 15],
                                [:equal, 18, 20, 15, 17]]],
                              %w(1 2 3 4 5 6 7 8 9 a b c d e f g h i j k),
                              %w(1 i 3 4 5 6 7 8 9 a b cX d h iX j k))
  end

  def test_ratio
    assert_ratio(0.75, "abcd", "bcde")
    assert_ratio(0.80, "efg", "eg")
  end

  def test_1_length_readable_diff
    differ = Test::Unit::Diff::ReadableDiffer.new(["0"], ["1"])
    def differ.cut_off_ratio
      0
    end
    def differ.default_ratio
      0
    end
    assert_equal("- 0\n" +
                 "? ^\n" +
                 "+ 1\n" +
                 "? ^",
                 differ.diff.join("\n"))
  end

  def test_same_contents_readable_diff
    assert_readable_diff("  aaa", ["aaa"], ["aaa"])
    assert_readable_diff("  aaa\n" \
                         "  bbb",
                         ["aaa", "bbb"], ["aaa", "bbb"])
  end

  def test_deleted_readable_diff
    assert_readable_diff("  aaa\n" \
                         "- bbb",
                         ["aaa", "bbb"], ["aaa"])
    assert_readable_diff("  aaa\n" \
                         "- bbb\n" \
                         "- ccc\n" \
                         "- ddd",
                         ["aaa", "bbb", "ccc", "ddd"], ["aaa"])
  end

  def test_inserted_readable_diff
    assert_readable_diff("  aaa\n" \
                         "+ bbb\n" \
                         "+ ccc\n" \
                         "+ ddd",
                         ["aaa"], ["aaa", "bbb", "ccc", "ddd"])
  end

  def test_replace_readable_diff
    assert_readable_diff("  aaa\n" \
                         "- bbb\n" \
                         "+ BbB\n" \
                         "  ccc\n" \
                         "- ddd\n" \
                         "- efg\n" \
                         "?  -\n" \
                         "+ eg",
                         ["aaa", "bbb", "ccc", "ddd", "efg"],
                         ["aaa", "BbB", "ccc", "eg"])

    assert_readable_diff("-  abcd xyz abc\n" \
                         "? -\n" \
                         "+ abcd abcd xyz abc\n" \
                         "?      +++++",
                         [" abcd xyz abc"],
                         ["abcd abcd xyz abc"])
  end

  def test_difference_readable_diff
    assert_readable_diff("- 1 tests, 0 assertions, 1 failures, 0 pendings\n" \
                         "?                        ^           ^\n" \
                         "+ 1 tests, 0 assertions, 0 failures, 1 pendings\n" \
                         "?                        ^           ^",
                         ["1 tests, 0 assertions, 1 failures, 0 pendings"],
                         ["1 tests, 0 assertions, 0 failures, 1 pendings"])
  end

  def test_complex_readable_diff
    assert_readable_diff("  aaa\n" \
                         "- bbb\n" \
                         "- ccc\n" \
                         "+ \n" \
                         "+   # \n" \
                         "  ddd",
                         ["aaa", "bbb", "ccc", "ddd"],
                         ["aaa", "", "  # ", "ddd"])

    assert_readable_diff("- one1\n" \
                         "?  ^\n" \
                         "+ ore1\n" \
                         "?  ^\n" \
                         "- two2\n" \
                         "- three3\n" \
                         "?  -   -\n" \
                         "+ tree\n" \
                         "+ emu",
                         ["one1", "two2", "three3"],
                         ["ore1", "tree", "emu"])
  end

  def test_empty_readable_diff
    assert_readable_diff("", [""], [""])
  end

  def test_unified_diff
    assert_unified_diff("",
                        ["one", "two", "three"],
                        ["one", "two", "three"],
                        "content 1",
                        "content 2")

    assert_unified_diff("--- Original Sat Jan 26 23:30:50 1991\n" \
                        "+++ Current Fri Jun 06 10:20:52 2003\n" \
                        "@@ -1,4 +1,4 @@\n" \
                        "+zero\n" \
                        " one\n" \
                        "-two\n" \
                        "-three\n" \
                        "+tree\n" \
                        " four",
                        ["one", "two", "three", "four"],
                        ["zero", "one", "tree", "four"],
                        "Original Sat Jan 26 23:30:50 1991",
                        "Current Fri Jun 06 10:20:52 2003",
                        :show_context => false)

    from = File.read(__FILE__).split(/\n/)
    to = from.dup
    target_line = __LINE__
    to[target_line - 1, 1] = []
    context = "  def test_unified_diff"
    summary = "@@ -#{target_line - 3},7 +#{target_line - 3},6 @@ #{context}"
    assert_unified_diff((["--- revision 10",
                          "+++ revision 11",
                          summary] +
                         from[target_line - 4, 3].collect {|line| " #{line}"} +
                         ["-#{from[target_line - 1]}"] +
                         from[target_line, 3].collect {|line| " #{line}"}
                         ).join("\n"),
                        from, to,
                        "revision 10",
                        "revision 11")
  end

  def test_empty_unified_diff
    assert_unified_diff("", [""], [""], "From", "To")
    assert_unified_diff("", [], [], "From", "To")
  end

  def test_diff_lines
    assert_diff_lines(["- ddd",
                       "- efg",
                       "?  -",
                       "+ eg"],
                      ["aaa", "bbb", "ccc", "ddd", "efg"],
                      ["aaa", "BbB", "ccc", "eg"],
                      3, 5, 3, 4)
  end

  def test_diff_line
    assert_diff_line(["- abcDefghiJkl",
                      "?    ^  ^  ^",
                      "+ abcdefGhijkl",
                      "?    ^  ^  ^"],
                     "abcDefghiJkl",
                     "abcdefGhijkl")

    assert_diff_line(["- bcDefghiJklx",
                      "?   ^  ^  ^  -",
                      "+ abcdefGhijkl",
                      "? +  ^  ^  ^"],
                     "bcDefghiJklx",
                     "abcdefGhijkl")
  end

  def test_empty_diff_line
    assert_diff_line(["- ",
                      "+ "],
                     "", "")
  end

  def test_format_diff_point
    assert_format_diff_point(["- \tabcDefghiJkl",
                              "? \t ^ ^  ^",
                              "+ \t\tabcdefGhijkl",
                              "? \t  ^ ^  ^"],
                             "\tabcDefghiJkl",
                             "\t\tabcdefGhijkl",
                             "  ^ ^  ^      ",
                             "+  ^ ^  ^      ")
    assert_format_diff_point(["- efg",
                              "?  ^",
                              "+ eg"],
                             "efg",
                             "eg",
                             " ^",
                             "")
  end

  def test_interesting_line
    from = ["class X",
            "  def find(x=0)",
            "    body",
            "  end",
            "end"]
    to = ["def xxx",
          "  raise 'not call me'",
          "end"]
    assert_interesting_line("  def find(x=0)",
                            from, to,
                            2, 1)
    assert_interesting_line("def xxx",
                            from, to,
                            2, 0)
    assert_interesting_line("class X",
                            from, to,
                            0, 0)
  end

  private
  def assert_found_binary_search_ranges(numeric, ranges)
    assert_true(Test::Unit::Diff::UTF8Line.send(:binary_search_ranges,
                                                numeric,
                                                ranges))
  end

  def assert_not_found_binary_search_ranges(numeric, ranges)
    assert_false(Test::Unit::Diff::UTF8Line.send(:binary_search_ranges,
                                                 numeric,
                                                 ranges))
  end

  def assert_to_indexes(expected, to, &junk_predicate)
    matcher = Test::Unit::Diff::SequenceMatcher.new([""], to, &junk_predicate)
    assert_equal(expected, matcher.instance_variable_get("@to_indexes"))
  end

  def assert_find_best_match_position(expected, from, to,
                                      from_start, from_end,
                                      to_start, to_end, &junk_predicate)
    matcher = Test::Unit::Diff::SequenceMatcher.new(from, to, &junk_predicate)
    assert_equal(expected, matcher.send(:find_best_match_position,
                                        from_start, from_end,
                                        to_start, to_end))
  end

  def assert_longest_match(expected, from, to,
                           from_start, from_end,
                           to_start, to_end, &junk_predicate)
    matcher = Test::Unit::Diff::SequenceMatcher.new(from, to, &junk_predicate)
    assert_equal(expected, matcher.longest_match(from_start, from_end,
                                                 to_start, to_end))
  end

  def assert_matches(expected, from, to, &junk_predicate)
    matcher = Test::Unit::Diff::SequenceMatcher.new(from, to, &junk_predicate)
    assert_equal(expected, matcher.send(:matches))
  end

  def assert_blocks(expected, from, to, &junk_predicate)
    matcher = Test::Unit::Diff::SequenceMatcher.new(from, to, &junk_predicate)
    assert_equal(expected, matcher.blocks)
  end

  def assert_operations(expected, from, to, &junk_predicate)
    matcher = Test::Unit::Diff::SequenceMatcher.new(from, to, &junk_predicate)
    assert_equal(expected, matcher.operations)
  end

  def assert_grouped_operations(expected, from, to)
    matcher = Test::Unit::Diff::SequenceMatcher.new(from, to)
    assert_equal(expected, matcher.grouped_operations)
  end

  def assert_ratio(expected, from, to)
    matcher = Test::Unit::Diff::SequenceMatcher.new(from, to)
    assert_in_delta(expected, 0.001, matcher.ratio)
  end

  def assert_readable_diff(expected, from, to)
    assert_equal(expected,
                 Test::Unit::Diff.readable(from.join("\n"), to.join("\n")))
  end

  def assert_unified_diff(expected, from, to, from_label, to_label, options={})
    options = options.merge(:from_label => from_label,
                            :to_label => to_label)
    assert_equal(expected,
                 Test::Unit::Diff.unified(from.join("\n"), to.join("\n"),
                                          options))
  end

  def assert_diff_lines(expected, from, to,
                        from_start, from_end,
                        to_start, to_end)
    differ = Test::Unit::Diff::ReadableDiffer.new(from, to)
    result = []
    differ.instance_variable_set("@result", result)
    differ.send(:diff_lines,
                from_start, from_end,
                to_start, to_end)
    assert_equal(expected, result)
  end

  def assert_diff_line(expected, from_line, to_line)
    differ = Test::Unit::Diff::ReadableDiffer.new([""], [""])
    result = []
    differ.instance_variable_set("@result", result)
    differ.send(:diff_line, from_line, to_line)
    assert_equal(expected, result)
  end

  def assert_format_diff_point(expected, from_line, to_line, from_tags, to_tags)
    differ = Test::Unit::Diff::ReadableDiffer.new([""], [""])
    result = []
    differ.instance_variable_set("@result", result)
    differ.send(:format_diff_point,
                from_line, to_line,
                from_tags, to_tags)
    assert_equal(expected, result)
  end

  def assert_interesting_line(expected, from, to, from_start, to_start)
    differ = Test::Unit::Diff::UnifiedDiffer.new(from, to)
    assert_equal(expected, differ.send(:find_interesting_line,
                                       from_start, to_start,
                                       :define_line?))
  end
end
