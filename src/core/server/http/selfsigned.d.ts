declare module 'selfsigned' {
  export function generate(
    attrs: any[],
    options: { [key: string]: any },
    done?: (err: Error, certs: any) => void
  ): any;
}
