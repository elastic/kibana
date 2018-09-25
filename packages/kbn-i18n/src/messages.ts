import { IFormats } from 'kbn-i18n-formats';

/**
 * Messages tree, where leafs are translated strings
 */
export interface Messages {
  [key: string]: PlainMessages;
}

export interface PlainMessages  {
  [key: string]: any;
  /**
   * locale of the messages
   */
  locale?: string;
  /**
   * set of options to the underlying formatter
   */
  formats?: IFormats;
};
