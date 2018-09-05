import expect from 'expect.js';
import { markdown } from '../markdown';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { testTable } from '../../common/__tests__/fixtures/test_tables';
import { fontStyle } from '../../common/__tests__/fixtures/test_styles';

describe('markdown', () => {
  const fn = functionWrapper(markdown);

  it('returns a render as markdown', () => {
    const result = fn(null, { _: [''], font: fontStyle });
    expect(result)
      .to.have.property('type', 'render')
      .and.to.have.property('as', 'markdown');
  });

  describe('args', () => {
    describe('_', () => {
      it('sets the content to all strings in _ concatenated', () => {
        const result = fn(null, {
          _: ['# this ', 'is ', 'some ', 'markdown'],
          font: fontStyle,
        });

        expect(result.value).to.have.property('content', '# this is some markdown');
      });

      it('compiles and concatenates handlebars expressions using context', () => {
        let expectedContent = 'Columns:';
        testTable.columns.map(col => (expectedContent += ` ${col.name}`));

        const result = fn(testTable, {
          _: ['Columns:', '{{#each columns}} {{name}}{{/each}}'],
        });

        expect(result.value).to.have.property('content', expectedContent);
      });

      // it('returns a markdown object with no content', () => {
      //   const result = fn(null, { font: fontStyle });

      //   expect(result.value).to.have.property('content', '');
      // });
    });

    describe('font', () => {
      it('sets the font style for the markdown', () => {
        const result = fn(null, {
          _: ['some ', 'markdown'],
          font: fontStyle,
        });

        expect(result.value).to.have.property('font', fontStyle);
      });

      // TODO: write test when using an instance of the interpreter
      // it("defaults to the expression '{font}'", () => {});
    });
  });
});
