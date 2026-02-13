# SecuritySolution Bug Report

This script automatically generates and emails daily reports of GitHub issues tagged with "Bug" and "Team: SecuritySolution" labels that were created in the last 24 hours.

## Features

- Fetches GitHub issues from the elastic/kibana repository
- Filters issues by:
  - Label: "Bug"
  - Label: "Team: SecuritySolution"
  - Created in the last 24 hours
- Generates formatted email reports with:
  - Issue ID
  - Issue URL
  - Issue Title
  - Creation timestamp
- Sends via SMTP (compatible with Thunderbird and other email clients)
- Can be scheduled to run daily at 10:00 AM using cron

## Prerequisites

### 1. Node.js and Dependencies

Ensure you have Node.js installed (version specified in `.nvmrc`), and run:

```bash
yarn kbn bootstrap
```

This installs all necessary dependencies including:
- `@octokit/rest` (GitHub API client)
- `nodemailer` (Email sending)

### 2. GitHub Personal Access Token

Create a GitHub personal access token with the following permissions:
- `repo` (for private repositories) or `public_repo` (for public repositories only)

To create a token:
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token"
3. Select scopes: `repo` or `public_repo`
4. Copy the generated token

### 3. Email Configuration

You need access to an SMTP server. Common options:

#### Gmail
- SMTP Host: `smtp.gmail.com`
- SMTP Port: `587` (TLS) or `465` (SSL)
- Enable "Less secure app access" or use an "App Password" (recommended)
- To create an App Password: Google Account → Security → 2-Step Verification → App passwords

#### Thunderbird
Thunderbird is an email client, not an SMTP server. To send emails "through Thunderbird":
1. Use the SMTP settings from your email provider (Gmail, Outlook, etc.)
2. Configure those settings in the environment variables below

#### Other Email Providers
- Outlook/Hotmail: `smtp-mail.outlook.com:587`
- Yahoo: `smtp.mail.yahoo.com:587`
- Custom SMTP server: Use your provider's settings

## Configuration

### Environment Variables

The script requires the following environment variables:

```bash
# Required: GitHub Authentication
export GITHUB_TOKEN="ghp_your_github_token_here"

# Optional: GitHub Repository (defaults to elastic/kibana)
export GITHUB_OWNER="elastic"
export GITHUB_REPO="kibana"

# Required: SMTP Configuration
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="your.email@gmail.com"
export SMTP_PASS="your_app_password_or_password"

# Required: Report Recipients (comma-separated)
export REPORT_EMAIL_TO="team@example.com,manager@example.com"
```

### Setting Up Environment Variables

#### Option 1: Create a `.env` file (recommended for testing)

Create a file `~/.kibana_security_report_env`:

```bash
export GITHUB_TOKEN="ghp_your_token"
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="your.email@gmail.com"
export SMTP_PASS="your_password"
export REPORT_EMAIL_TO="team@example.com"
```

Then source it before running:
```bash
source ~/.kibana_security_report_env
node scripts/report_security_solution_bugs.js
```

#### Option 2: Set in your shell profile (for permanent setup)

Add the exports to `~/.bashrc`, `~/.zshrc`, or equivalent:

```bash
# Add to ~/.bashrc or ~/.zshrc
export GITHUB_TOKEN="ghp_your_token"
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="your.email@gmail.com"
export SMTP_PASS="your_password"
export REPORT_EMAIL_TO="team@example.com"
```

## Usage

### Manual Execution

Run the script manually to test:

```bash
# From the kibana repository root
cd /home/runner/work/kibana/kibana

# Make sure environment variables are set
source ~/.kibana_security_report_env

# Run the script
node scripts/report_security_solution_bugs.js
```

Expected output:
```
Starting SecuritySolution Bug Report generation...
Repository: elastic/kibana
Fetching issues created since: 2026-02-12T10:13:58.090Z
Search query: repo:elastic/kibana is:issue label:"Bug" label:"Team: SecuritySolution" created:>=2026-02-12T10:13:58.090Z
Found 5 issues
SMTP connection verified
Sending email to: team@example.com
Email sent successfully: <message-id@example.com>
Report sent successfully!
```

### Scheduled Execution (Cron)

To run the script daily at 10:00 AM:

1. **Create an environment file** (if not already done):
   ```bash
   nano ~/.kibana_security_report_env
   # Add all required environment variables as shown above
   ```

2. **Edit your crontab**:
   ```bash
   crontab -e
   ```

3. **Add the cron job** (adjust paths as needed):
   ```cron
   # Run daily at 10:00 AM
   0 10 * * * source ~/.kibana_security_report_env && cd /home/runner/work/kibana/kibana && node scripts/report_security_solution_bugs.js >> /var/log/security_solution_bug_report.log 2>&1
   ```

4. **Verify the cron job**:
   ```bash
   crontab -l
   ```

5. **Check logs**:
   ```bash
   tail -f /var/log/security_solution_bug_report.log
   ```

### Alternative: Using systemd timer (Linux)

For more reliable scheduling on Linux systems:

1. **Create a service file** `/etc/systemd/system/security-bug-report.service`:
   ```ini
   [Unit]
   Description=SecuritySolution Bug Report
   
   [Service]
   Type=oneshot
   User=your-username
   WorkingDirectory=/home/runner/work/kibana/kibana
   EnvironmentFile=/home/your-username/.kibana_security_report_env
   ExecStart=/usr/bin/node scripts/report_security_solution_bugs.js
   StandardOutput=journal
   StandardError=journal
   ```

2. **Create a timer file** `/etc/systemd/system/security-bug-report.timer`:
   ```ini
   [Unit]
   Description=Run SecuritySolution Bug Report daily at 10:00 AM
   
   [Timer]
   OnCalendar=daily
   OnCalendar=10:00
   Persistent=true
   
   [Install]
   WantedBy=timers.target
   ```

3. **Enable and start the timer**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable security-bug-report.timer
   sudo systemctl start security-bug-report.timer
   ```

4. **Check status**:
   ```bash
   sudo systemctl status security-bug-report.timer
   sudo systemctl list-timers
   ```

## Report Format

### Email Subject
```
SecuritySolution Bug Report - 2/13/2026 (5 new issues)
```

### Email Body (HTML)
The report includes:
- Date header
- Summary box with total count
- Table with columns: Issue #, Title, Created At
- Clickable links to each issue

### Email Body (Plain Text)
Plain text alternative for email clients that don't support HTML.

## Troubleshooting

### GitHub API Errors

**Error: "Bad credentials"**
- Check that your `GITHUB_TOKEN` is valid
- Ensure the token has the required scopes (`repo` or `public_repo`)

**Error: "Rate limit exceeded"**
- GitHub API has rate limits (5,000 requests/hour for authenticated requests)
- The script should be well within limits for daily runs
- Wait an hour or use a different token

### SMTP/Email Errors

**Error: "Invalid login"**
- Verify `SMTP_USER` and `SMTP_PASS` are correct
- For Gmail, ensure you're using an App Password, not your account password
- Check if "Less secure app access" is enabled (if not using App Password)

**Error: "Connection timeout"**
- Check firewall settings
- Verify `SMTP_HOST` and `SMTP_PORT`
- Try port 465 (SSL) instead of 587 (TLS)

**Error: "Self-signed certificate"**
- For self-signed certificates, you may need to add `tls: { rejectUnauthorized: false }` to the transporter config (not recommended for production)

### No Issues Found

If the report shows "No new bugs reported in the last 24 hours":
- This is expected if there are no matching issues
- Verify the labels exist in the repository: "Bug" and "Team: SecuritySolution"
- Check if any issues were created in the last 24 hours with those labels

### Cron Not Running

**Script doesn't run at scheduled time:**
- Check cron is running: `sudo systemctl status cron`
- Verify the cron job syntax: `crontab -l`
- Check system logs: `grep CRON /var/log/syslog`
- Ensure environment variables are accessible to cron
- Use absolute paths for all commands and scripts

**Environment variables not working in cron:**
- Cron has a minimal environment; use `source` to load variables
- Or use the `env` command to set variables inline
- Check cron user has permission to read the environment file

## Security Considerations

1. **Never commit tokens or passwords** to version control
2. **Use App Passwords** for email instead of account passwords
3. **Restrict file permissions** for environment files:
   ```bash
   chmod 600 ~/.kibana_security_report_env
   ```
4. **Use token rotation** - regularly update your GitHub token
5. **Limit token scope** - only grant necessary permissions

## Customization

### Changing the Time Window

To report issues from a different time period, modify the `fetchRecentBugs()` function:

```javascript
// For last 7 days instead of 24 hours
const since = new Date();
since.setDate(since.getDate() - 7);
```

### Changing Labels

To report different labels, modify the search query in `fetchRecentBugs()`:

```javascript
const searchQuery = [
  `repo:${GITHUB_OWNER}/${GITHUB_REPO}`,
  'is:issue',
  'label:"Bug"',
  'label:"Your-Custom-Label"', // Change this
  `created:>=${sinceISO}`,
].join(' ');
```

### Customizing Email Format

Modify the `generateHtmlReport()` and `generateTextReport()` functions to change the email appearance.

## Testing

### Dry Run (without sending email)

To test fetching issues without sending email, comment out the `sendEmailReport()` call:

```javascript
async function main() {
  try {
    console.log('Starting SecuritySolution Bug Report generation...');
    
    const issues = await fetchRecentBugs();
    console.log('Issues found:', JSON.stringify(issues, null, 2));
    
    // await sendEmailReport(issues); // Comment this out for dry run
    
    console.log('Report generated successfully!');
  } catch (error) {
    console.error('Error generating report:', error.message);
    process.exit(1);
  }
}
```

### Testing Email

To test email functionality with dummy data:

```javascript
const testIssues = [
  {
    id: 12345,
    url: 'https://github.com/elastic/kibana/issues/12345',
    title: 'Test Bug Issue',
    createdAt: new Date().toISOString(),
    labels: ['Bug', 'Team: SecuritySolution'],
  },
];

await sendEmailReport(testIssues);
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the script logs for error messages
3. Verify all environment variables are set correctly
4. Test manually before setting up scheduled execution

## License

This script is part of the Kibana repository and follows the same license terms.
