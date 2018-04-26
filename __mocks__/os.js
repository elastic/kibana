const os = jest.genMockFromModule('os');

os.homedir = () => '/myHomeDir';

module.exports = os;
