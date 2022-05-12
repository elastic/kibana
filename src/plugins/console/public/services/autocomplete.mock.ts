

import { AutocompleteInfo } from './autocomplete';

export class AutocompleteInfoMock extends AutocompleteInfo {
  setup = jest.fn();
  retrieve = jest.fn();
  clearSubscriptions = jest.fn();
  clear = jest.fn();
}
