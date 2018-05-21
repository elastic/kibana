export const getIndexPatternsMock = () => {
  return Promise.resolve([
    {
      id: 'indexPattern1',
      attributes: {
        title: 'indexPattern1'
      }
    },
    {
      id: 'indexPattern2',
      attributes: {
        title: 'indexPattern2'
      }
    }
  ]);
};
