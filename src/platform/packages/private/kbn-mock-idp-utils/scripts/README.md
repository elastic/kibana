# Token Decoder Script

This directory contains a command-line script for decoding tokens that have been encoded with checksum and prefix.

## decode_token.js

Decodes tokens that have been encoded with the `essu_dev_` prefix and CRC32 checksum.

### Usage

Run the script directly with Node.js:

```bash
node src/platform/packages/private/kbn-mock-idp-utils/scripts/decode_token.js "essu_dev_YOUR_TOKEN_HERE"
```


### What it does

The script:
1. Removes the `essu_dev_` prefix
2. Decodes the base64 string and verifies the CRC32 checksum
3. Outputs the original JWT string
4. Pretty-prints the JWT header, payload, and signature

### Example Output

```
Decoded JWT:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXAiOiJhY2Nlc3MtdG9rZW4iLCJpc3MiOiJlbGFzdGljLWNsb3VkIiwic2p0IjoidXNlciIsIm9pZCI6Im9yZy0xMjMiLCJzdWIiOiJ1c2VyLTEyMyIsIm5iZiI6MTYzNDU2Nzg5MCwiZXhwIjoxNjM0NTY3OTUwLCJpYXQiOjE2MzQ1Njc4OTAsImp0aSI6ImFiYzEyMyJ9.signature

JWT Parts:
----------
Header:
{
  "typ": "JWT",
  "alg": "HS256"
}

Payload:
{
  "typ": "access-token",
  "iss": "elastic-cloud",
  "sjt": "user",
  "oid": "org-123",
  "sub": "user-123",
  "nbf": 1634567890,
  "exp": 1634567950,
  "iat": 1634567890,
  "jti": "abc123"
}

Signature: signature
```

### Error Handling

The script will exit with an error if:
- No token argument is provided
- The token doesn't start with the `essu_dev_` prefix
- The checksum verification fails (data corruption)
- The token format is invalid
