const render = jest.fn();
const unmountComponentAtNode = jest.fn();

jest.doMock('react-dom', () => ({ render, unmountComponentAtNode }));

const { renderCreateIndexPatternWizard, destroyCreateIndexPatternWizard } = require('../render');

describe('CreateIndexPatternWizardRender', () => {
  beforeEach(() => {
    jest.spyOn(document, 'getElementById').mockImplementation(() => ({}));
    render.mockClear();
    unmountComponentAtNode.mockClear();
  });

  it('should call render', () => {
    renderCreateIndexPatternWizard(
      '',
      '',
      {
        es: {},
        indexPatterns: {},
        savedObjectsClient: {},
        config: {},
        changeUrl: () => {},
      }
    );

    expect(render.mock.calls.length).toBe(1);
  });

  it('should call unmountComponentAtNode', () => {
    destroyCreateIndexPatternWizard();
    expect(unmountComponentAtNode.mock.calls.length).toBe(1);
  });
});
