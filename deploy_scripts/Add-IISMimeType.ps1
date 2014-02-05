param(
  [Parameter(Mandatory=$true)][string] $mimeType,
  [Parameter(Mandatory=$true)][string] $mimeFileExtension
)
Import-Module WebAdministration

$mimePresent =  get-webconfigurationproperty //staticContent -name collection | Where { $_.mimeType -eq $mimeType -And $_.fileExtension -eq $mimeFileExtension }

if ( $mimePresent -eq $null)
{
	add-webconfigurationproperty //staticContent -name collection -value @{fileExtension=$mimeFileExtension; mimeType=$mimeType}
	Write-Host "MimeType added to IIS: '$mimeType', '$mimeFileExtension'"
}
else
{
	Write-Host "MimeType allready present in IIS: '$mimeType', '$mimeFileExtension'"
}
