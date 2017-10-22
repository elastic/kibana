export default (handleChange, model) => part => {
  const doc = {
    ...model,
    ...part
  };
  handleChange(doc);
};
