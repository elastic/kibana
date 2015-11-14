module.exports = {
  templateToPattern: (templateName) => {
    return templateName.slice(templateName.indexOf('-') + 1);
  },

  patternToTemplate: (patternName) => {
    return `kibana-${patternName.toLowerCase()}`;
  }
};
