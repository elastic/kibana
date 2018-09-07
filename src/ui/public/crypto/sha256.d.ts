export class Sha256 {
  update(json: string, encoding: string): Sha256;
  digest(encoding: string): string;
}