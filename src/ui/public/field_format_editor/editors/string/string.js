import stringTemplate from './string.html';

export function stringEditor() {
  return {
    formatId: 'string',
    template: stringTemplate,
    controllerAs: 'cntrl',
    controller: function () {
      this.transformOpts = [
        { id: false, name: '- none -' },
        { id: 'lower', name: 'Lower Case' },
        { id: 'upper', name: 'Upper Case' },
        { id: 'title', name: 'Title Case' },
        { id: 'short', name: 'Short Dots' },
        { id: 'base64', name: 'Base64 Decode' }
      ];
      this.sampleInputs = [
        'A Quick Brown Fox.',
        'STAY CALM!',
        'com.organizations.project.ClassName',
        'hostname.net',
        'SGVsbG8gd29ybGQ='
      ];
    }
  };
}
