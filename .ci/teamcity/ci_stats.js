const https = require('https');
const token = process.env.CI_STATS_TOKEN;
const host = process.env.CI_STATS_HOST;

const request = (url, options, data = null) => {
  const httpOptions = {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `token ${token}`,
    },
  };

  return new Promise((resolve, reject) => {
    console.log(`Calling https://${host}${url}`);

    const req = https.request(`https://${host}${url}`, httpOptions, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`Status Code: ${res.statusCode}`));
      }

      const data = [];
      res.on('data', (d) => {
        data.push(d);
      })

      res.on('end', () => {
        try {
          let resp = Buffer.concat(data).toString();

          try {
            if (resp.trim()) {
              resp = JSON.parse(resp);
            }
          } catch (ex) {
            console.error(ex);
          }

          resolve(resp);
        } catch (ex) {
          reject(ex);
        }
      });
    })

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

module.exports = {
  get: (url) => request(url, { method: 'GET' }),
  post: (url, data) => request(url, { method: 'POST' }, data),
}
