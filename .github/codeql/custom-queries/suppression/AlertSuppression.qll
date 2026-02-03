/**
 * @notice
 *
 * Copyright (c) GitHub, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the https://github.com/github/codeql repository.
 */

overlay[local?]
module;

signature class AstNode {
  predicate hasLocationInfo(
    string filepath, int startline, int startcolumn, int endline, int endcolumn
  );
}

signature class SingleLineComment {
  /** Gets a textual representation of this element. */
  string toString();

  /**
   * Holds if this element is at the specified location.
   * The location spans column `startcolumn` of line `startline` to
   * column `endcolumn` of line `endline` in file `filepath`.
   * For more information, see
   * [Locations](https://codeql.github.com/docs/writing-codeql-queries/providing-locations-in-codeql-queries/).
   */
  predicate hasLocationInfo(
    string filepath, int startline, int startcolumn, int endline, int endcolumn
  );

  /**
   * Gets the text of this suppression comment.
   */
  string getText();
}

/**
 * Constructs an alert suppression query.
 */
module Make<AstNode Node, SingleLineComment Comment> {
  final private class FinalCommnent = Comment;

  /**
   * An alert suppression comment.
   */
  abstract class SuppressionComment extends FinalCommnent {
    /** Gets the suppression annotation in this comment. */
    abstract string getAnnotation();

    /**
     * Holds if this comment applies to the range from column `startcolumn` of line `startline`
     * to column `endcolumn` of line `endline` in file `filepath`.
     */
    abstract predicate covers(
      string filepath, int startline, int startcolumn, int endline, int endcolumn
    );

    /** Gets the scope of this suppression. */
    SuppressionScope getScope() { this = result.getSuppressionComment() }
  }

  private class LgtmSuppressionComment extends SuppressionComment {
    private string annotation;

    LgtmSuppressionComment() {
      exists(string text | text = this.(Comment).getText() |
        // match `lgtm[...]` anywhere in the comment
        annotation = text.regexpFind("(?i)\\blgtm\\s*\\[[^\\]]*\\]", _, _)
        or
        // match `lgtm` at the start of the comment and after semicolon
        annotation = text.regexpFind("(?i)(?<=^|;)\\s*lgtm(?!\\B|\\s*\\[)", _, _).trim()
      )
    }

    override string getAnnotation() { result = annotation }

    override predicate covers(
      string filepath, int startline, int startcolumn, int endline, int endcolumn
    ) {
      this.hasLocationInfo(filepath, startline, _, endline, endcolumn) and
      startcolumn = 1
      or
      exists(int cStartLine, int cStartColumn, int cEndLine, int cEndColumn |
        this.hasLocationInfo(filepath, cStartLine, cStartColumn, cEndLine, cEndColumn) and
        not exists(int c, Node n | c < cStartColumn |
          n.hasLocationInfo(filepath, _, _, cStartLine, c) or
          n.hasLocationInfo(filepath, cStartLine, c, _, _)
        ) and
        // when there is no column information, a location spans the whole line
        startcolumn = 0 and
        endcolumn = 0 and
        startline = cEndLine + 1 and
        endline = startline
      )
    }
  }

  private class CodeQlSuppressionComment extends SuppressionComment {
    private string annotation;

    CodeQlSuppressionComment() {
      // match `codeql[...]` anywhere in the comment
      annotation = this.(Comment).getText().regexpFind("(?i)\\bcodeql\\s*\\[[^\\]]*\\]", _, _) and
      exists(string filepath, int cStartLine, int cStartColumn |
        this.(Comment).hasLocationInfo(filepath, cStartLine, cStartColumn, _, _) and
        not exists(int c, Node n | c < cStartColumn |
          n.hasLocationInfo(filepath, _, _, cStartLine, c) or
          n.hasLocationInfo(filepath, cStartLine, c, _, _)
        )
      )
    }

    override string getAnnotation() { result = "lgtm" + annotation.suffix(6) }

    override predicate covers(
      string filepath, int startline, int startcolumn, int endline, int endcolumn
    ) {
      this.hasLocationInfo(filepath, _, _, startline - 1, _) and
      // when there is no column information, a location spans the whole line
      startcolumn = 0 and
      endcolumn = 0 and
      endline = startline
    }
  }

  /**
   * The scope of an alert suppression comment.
   */
  private class SuppressionScope instanceof SuppressionComment {
    /** Gets a suppression comment with this scope. */
    SuppressionComment getSuppressionComment() { result = this }

    /**
     * Holds if this element is at the specified location.
     * The location spans column `startcolumn` of line `startline` to
     * column `endcolumn` of line `endline` in file `filepath`.
     * For more information, see
     * [Locations](https://codeql.github.com/docs/writing-codeql-queries/providing-locations-in-codeql-queries/).
     */
    predicate hasLocationInfo(
      string filepath, int startline, int startcolumn, int endline, int endcolumn
    ) {
      this.(SuppressionComment).covers(filepath, startline, startcolumn, endline, endcolumn)
    }

    /** Gets a textual representation of this element. */
    string toString() { result = "suppression range" }
  }

  query predicate suppressions(
    SuppressionComment c, string text, string annotation, SuppressionScope scope
  ) {
    text = c.getText() and // text of suppression comment (excluding delimiters)
    annotation = c.getAnnotation() and // text of suppression annotation
    scope = c.getScope() // scope of suppression
  }
}
