import { Transport, SniffOptions } from '@elastic/transport';
export default class SniffingTransport extends Transport {
    sniff(opts: SniffOptions): void;
}
