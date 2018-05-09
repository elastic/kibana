export const getIndexPatternMock = () => {
  return Promise.resolve({
    id: 'mockIndexPattern',
    title: 'mockIndexPattern',
    fields: [
      { name: 'keywordField', type: 'string', aggregatable: true },
      { name: 'textField', type: 'string', aggregatable: false },
      { name: 'numberField', type: 'number', aggregatable: true }
    ]
  });
};
